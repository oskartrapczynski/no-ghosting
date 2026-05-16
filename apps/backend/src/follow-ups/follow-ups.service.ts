import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue("follow-ups") private followUpQueue: Queue,
  ) {}

  /**
   * Scan for candidates who are overdue for a follow-up
   * and enqueue jobs for them.
   */
  async scheduleOverdueFollowUps(tenantId?: string) {
    const now = new Date();

    const overdue = await this.prisma.candidatePipeline.findMany({
      where: {
        status: "ACTIVE",
        nextFollowUpAt: { lte: now },
        ...(tenantId && {
          pipeline: { tenantId },
        }),
      },
      include: {
        candidate: true,
        pipeline: true,
        stage: {
          include: { followUpRules: { where: { active: true } } },
        },
      },
    });

    this.logger.log(`Found ${overdue.length} overdue follow-ups`);

    for (const cp of overdue) {
      const rule = cp.stage.followUpRules[0]; // pick first active rule
      if (!rule) continue;

      // Count previous attempts
      const attempts = await this.prisma.followUpLog.count({
        where: { candidatePipelineId: cp.id, ruleId: rule.id },
      });

      if (attempts >= rule.maxAttempts) {
        // Mark as ghosted — max attempts reached
        await this.prisma.candidatePipeline.update({
          where: { id: cp.id },
          data: { status: "GHOSTED" },
        });
        this.logger.warn(
          `Candidate ${cp.candidate.name} marked as GHOSTED (max attempts)`,
        );
        continue;
      }

      await this.followUpQueue.add("send-follow-up", {
        candidatePipelineId: cp.id,
        ruleId: rule.id,
        attemptNumber: attempts + 1,
      });
    }

    return { scheduled: overdue.length };
  }

  /** Get follow-up rules for a stage */
  async getRulesForStage(stageId: string) {
    return this.prisma.followUpRule.findMany({
      where: { stageId },
      orderBy: { delayDays: "asc" },
    });
  }

  /** Create or update a follow-up rule */
  async upsertRule(
    stageId: string,
    data: {
      delayDays: number;
      channelType: "EMAIL" | "SMS" | "ATS_MESSAGE";
      templateSubject?: string;
      templateBody: string;
      maxAttempts?: number;
      escalate?: boolean;
    },
  ) {
    return this.prisma.followUpRule.create({
      data: {
        stageId,
        ...data,
      },
    });
  }
}
