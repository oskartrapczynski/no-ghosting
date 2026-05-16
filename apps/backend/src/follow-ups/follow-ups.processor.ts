import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { emailChannel, smsChannel } from "@no-ghosting/channels";
import type { FollowUpMessage } from "@no-ghosting/shared";

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
      },
    });

    if (!cp || cp.status !== "ACTIVE") return;

    const rule = await this.prisma.followUpRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.active) return;

    // Get channel config for this tenant
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

    // Build message from template
    const body = rule.templateBody
      .replace(/\{\{candidateName\}\}/g, cp.candidate.name)
      .replace(/\{\{pipelineName\}\}/g, cp.pipeline.name)
      .replace(/\{\{stageName\}\}/g, cp.stage.name)
      .replace(/\{\{attemptNumber\}\}/g, String(attemptNumber));

    const subject = rule.templateSubject
      ?.replace(/\{\{candidateName\}\}/g, cp.candidate.name)
      ?.replace(/\{\{pipelineName\}\}/g, cp.pipeline.name);

    const message: FollowUpMessage = {
      to: {
        email: cp.candidate.email,
        phone: cp.candidate.phone ?? undefined,
        atsId: cp.candidate.atsId ?? undefined,
      },
      subject: subject ?? undefined,
      body,
      candidateName: cp.candidate.name,
      pipelineName: cp.pipeline.name,
      stageName: cp.stage.name,
      attemptNumber,
    };

    // Send via appropriate channel
    const channel = rule.channelType === "EMAIL" ? emailChannel : smsChannel;
    const result = await channel.send(
      message,
      channelConfig.config as Record<string, unknown>,
    );

    // Log the attempt
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

    // Schedule next follow-up
    if (result.success) {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + rule.delayDays);
      await this.prisma.candidatePipeline.update({
        where: { id: candidatePipelineId },
        data: {
          lastContactAt: new Date(),
          nextFollowUpAt: nextFollowUp,
        },
      });
    }

    this.logger.log(
      `Follow-up ${result.success ? "sent" : "failed"} for ${cp.candidate.name} (attempt ${attemptNumber})`,
    );
  }
}
