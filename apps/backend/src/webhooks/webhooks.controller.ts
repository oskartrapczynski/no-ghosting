import { Body, Controller, NotFoundException, Post } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { TenantId } from "../auth/tenant.decorator";

class RecruiterRepliedDto {
  /** Either candidatePipelineId (our DB id) or candidateAtsId (ATS external id) must be provided. */
  @IsOptional()
  @IsString()
  candidatePipelineId?: string;

  @IsOptional()
  @IsString()
  candidateAtsId?: string;
}

@Controller("webhooks/ats")
export class WebhooksController {
  constructor(private prisma: PrismaService) {}

  /**
   * Called by an ATS adapter (or external webhook) when the recruiter has
   * actually replied to the candidate. Resets the nudge timer.
   */
  @Post("recruiter-replied")
  async recruiterReplied(
    @TenantId() tenantId: string,
    @Body() body: RecruiterRepliedDto,
  ) {
    const cp = await this.findCandidatePipeline(tenantId, body);
    if (!cp) throw new NotFoundException("Candidate pipeline not found");

    // Reset clock; cron will reschedule based on stage rules when delay elapses.
    const rule = await this.prisma.followUpRule.findFirst({
      where: { stageId: cp.currentStageId, active: true },
      orderBy: { delayDays: "asc" },
    });
    const nextFollowUpAt = new Date();
    nextFollowUpAt.setDate(nextFollowUpAt.getDate() + (rule?.delayDays ?? 3));

    return this.prisma.candidatePipeline.update({
      where: { id: cp.id },
      data: { lastContactAt: new Date(), nextFollowUpAt },
    });
  }

  private async findCandidatePipeline(
    tenantId: string,
    body: RecruiterRepliedDto,
  ) {
    if (body.candidatePipelineId) {
      return this.prisma.candidatePipeline.findFirst({
        where: {
          id: body.candidatePipelineId,
          candidate: { tenantId },
        },
      });
    }
    if (body.candidateAtsId) {
      return this.prisma.candidatePipeline.findFirst({
        where: {
          candidate: { tenantId, atsId: body.candidateAtsId },
        },
      });
    }
    return null;
  }
}
