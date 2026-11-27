import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { emailChannel, smsChannel } from "@no-ghosting/channels";
import type { FollowUpMessage } from "@no-ghosting/shared";
import { daysSince, renderTemplate } from "./follow-ups.utils";

interface FollowUpJobData {
  candidatePipelineId: string;
  ruleId: string;
  attemptNumber: number;
}

@Processor("follow-ups")
export class FollowUpsProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowUpsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<FollowUpJobData>) {
    const { candidatePipelineId, ruleId, attemptNumber } = job.data;

    const cp = await this.prisma.candidatePipeline.findUnique({
      where: { id: candidatePipelineId },
      include: {
        candidate: true,
        pipeline: { include: { tenant: true } },
        stage: true,
        assignedRecruiter: true,
      },
    });

    if (!cp || cp.status !== "ACTIVE") return;

    const rule = await this.prisma.followUpRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule || !rule.active) return;

    if (!cp.assignedRecruiter) {
      this.logger.warn(
        `Candidate ${cp.candidate.name} has no assigned recruiter — skipping nudge`,
      );
      await this.prisma.followUpLog.create({
        data: {
          candidatePipelineId,
          ruleId,
          channelType: rule.channelType,
          attemptNumber,
          failedAt: new Date(),
          failureReason: "No assigned recruiter",
        },
      });
      return;
    }

    const channelConfig = await this.prisma.channelConfig.findUnique({
      where: {
        tenantId_channelType: {
          tenantId: cp.pipeline.tenantId,
          channelType: rule.channelType,
        },
      },
    });
    if (!channelConfig) {
      this.logger.error(
        `No ${rule.channelType} channel configured for tenant ${cp.pipeline.tenant.name}`,
      );
      return;
    }

    const daysSilent = daysSince(cp.lastContactAt);

    const renderVars = {
      recruiterName: cp.assignedRecruiter.name ?? cp.assignedRecruiter.email,
      candidateName: cp.candidate.name,
      candidateEmail: cp.candidate.email,
      pipelineName: cp.pipeline.name,
      stageName: cp.stage.name,
      daysSilent: String(daysSilent),
      attemptNumber: String(attemptNumber),
    };

    const render = (tpl: string) => renderTemplate(tpl, renderVars);

    const body = render(rule.templateBody);
    const subject = rule.templateSubject ? render(rule.templateSubject) : undefined;

    const message: FollowUpMessage = {
      to: {
        email: cp.assignedRecruiter.email,
        slackId: cp.assignedRecruiter.slackId ?? undefined,
      },
      subject,
      body,
      recruiterName: cp.assignedRecruiter.name ?? undefined,
      candidateName: cp.candidate.name,
      candidateEmail: cp.candidate.email,
      pipelineName: cp.pipeline.name,
      stageName: cp.stage.name,
      daysSilent,
      attemptNumber,
    };

    const channel = rule.channelType === "EMAIL" ? emailChannel : smsChannel;
    const result = await channel.send(
      message,
      channelConfig.config as Record<string, unknown>,
    );

    await this.prisma.followUpLog.create({
      data: {
        candidatePipelineId,
        ruleId,
        channelType: rule.channelType,
        attemptNumber,
        deliveredAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        failureReason: result.error,
      },
    });

    // On success: schedule next nudge (in case recruiter still doesn't act).
    // The webhook from ATS (recruiter replies to candidate) will reset this.
    if (result.success) {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + rule.delayDays);
      await this.prisma.candidatePipeline.update({
        where: { id: candidatePipelineId },
        data: { nextFollowUpAt: nextFollowUp },
      });
    }

    this.logger.log(
      `Nudge ${result.success ? "sent" : "failed"} to ${cp.assignedRecruiter.email} re ${cp.candidate.name} (attempt ${attemptNumber})`,
    );
  }
}
