import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFollowUpRuleDto, UpdateFollowUpRuleDto } from './follow-ups.dto'

/** Sentinel pushed onto nextFollowUpAt when a job is enqueued, so the same
 *  candidate isn't re-enqueued on the next cron tick before the worker runs.
 *  The worker overwrites it with the real next-attempt time (or null) on
 *  completion / failure. */
const REENQUEUE_LOCK_MINUTES = 60

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name)

  constructor(
    private prisma: PrismaService,
    @InjectQueue('follow-ups') private followUpQueue: Queue,
  ) {}

  /**
   * Scan for candidates who are overdue for a follow-up and enqueue jobs.
   * Each candidate has its `nextFollowUpAt` pushed forward atomically before
   * enqueue to prevent double-scheduling if cron fires again.
   */
  async scheduleOverdueFollowUps(tenantId?: string) {
    const now = new Date()

    const overdue = await this.prisma.candidatePipeline.findMany({
      where: {
        status: 'ACTIVE',
        nextFollowUpAt: { lte: now },
        ...(tenantId && { pipeline: { tenantId } }),
      },
      include: {
        candidate: true,
        stage: {
          include: {
            followUpRules: {
              where: { active: true },
              orderBy: { delayDays: 'asc' },
            },
          },
        },
      },
    })

    this.logger.log(`Found ${overdue.length} overdue follow-ups`)

    let scheduled = 0
    for (const cp of overdue) {
      const rules = cp.stage.followUpRules
      if (rules.length === 0) continue

      // Count nudges the recruiter has *ignored*: delivered since the last
      // recruiter→candidate contact. A recruiter reply (webhook) moves
      // lastContactAt forward, which resets this counter. Failed sends don't
      // count — the recruiter never saw them.
      const previousAttempts = await this.prisma.followUpLog.count({
        where: {
          candidatePipelineId: cp.id,
          deliveredAt: { not: null },
          ...(cp.lastContactAt && { sentAt: { gte: cp.lastContactAt } }),
        },
      })

      // Pick the rule for this attempt index (escalating). Cap at last rule.
      const rule = rules[Math.min(previousAttempts, rules.length - 1)]

      if (previousAttempts >= rule.maxAttempts) {
        await this.prisma.candidatePipeline.update({
          where: { id: cp.id },
          data: { status: 'GHOSTED' },
        })
        this.logger.warn(
          `Candidate ${cp.candidate.name} marked as GHOSTED (max attempts)`,
        )
        continue
      }

      // Push nextFollowUpAt forward BEFORE enqueue. Use updateMany with a
      // version check on the old value so a concurrent cron tick can't grab
      // the same row.
      const lockUntil = new Date(
        now.getTime() + REENQUEUE_LOCK_MINUTES * 60_000,
      )
      const claim = await this.prisma.candidatePipeline.updateMany({
        where: { id: cp.id, nextFollowUpAt: cp.nextFollowUpAt },
        data: { nextFollowUpAt: lockUntil },
      })
      if (claim.count === 0) continue

      await this.followUpQueue.add('send-follow-up', {
        candidatePipelineId: cp.id,
        ruleId: rule.id,
        attemptNumber: previousAttempts + 1,
      })
      scheduled++
    }

    return { scheduled }
  }

  /** Get follow-up rules for a stage (scoped to tenant). */
  async getRulesForStage(tenantId: string, stageId: string) {
    await this.assertStageBelongsToTenant(tenantId, stageId)
    return this.prisma.followUpRule.findMany({
      where: { stageId },
      orderBy: { delayDays: 'asc' },
    })
  }

  /** Create a follow-up rule (scoped to tenant). */
  async upsertRule(
    tenantId: string,
    stageId: string,
    data: CreateFollowUpRuleDto,
  ) {
    await this.assertStageBelongsToTenant(tenantId, stageId)
    return this.prisma.followUpRule.create({
      data: { stageId, ...data },
    })
  }

  /** Update a follow-up rule (scoped to tenant). */
  async updateRule(
    tenantId: string,
    ruleId: string,
    data: UpdateFollowUpRuleDto,
  ) {
    const rule = await this.prisma.followUpRule.findFirst({
      where: { id: ruleId, stage: { pipeline: { tenantId } } },
      select: { id: true },
    })
    if (!rule) throw new NotFoundException('Rule not found')
    return this.prisma.followUpRule.update({
      where: { id: ruleId },
      data,
    })
  }

  /** Delete a follow-up rule (scoped to tenant). */
  async deleteRule(tenantId: string, ruleId: string) {
    const rule = await this.prisma.followUpRule.findFirst({
      where: { id: ruleId, stage: { pipeline: { tenantId } } },
      select: { id: true },
    })
    if (!rule) throw new NotFoundException('Rule not found')
    await this.prisma.followUpRule.delete({ where: { id: ruleId } })
    return { deleted: true }
  }

  private async assertStageBelongsToTenant(tenantId: string, stageId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId, pipeline: { tenantId } },
      select: { id: true },
    })
    if (!stage) throw new NotFoundException('Stage not found')
  }
}
