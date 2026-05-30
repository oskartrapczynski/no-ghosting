import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, status?: string) {
    return this.prisma.candidate.findMany({
      where: {
        tenantId,
        ...(status && {
          pipelines: { some: { status: status as any } },
        }),
      },
      include: {
        pipelines: {
          where: status ? { status: status as any } : undefined,
          include: {
            pipeline: true,
            stage: true,
            assignedRecruiter: true,
            followUpLogs: { orderBy: { sentAt: "desc" }, take: 5 },
          },
        },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, tenantId },
      include: {
        pipelines: {
          include: {
            pipeline: true,
            stage: true,
            assignedRecruiter: true,
            followUpLogs: { orderBy: { sentAt: "desc" } },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    return candidate;
  }

  /** Mark that recruiter contacted the candidate (resets follow-up timer) */
  async markContacted(
    tenantId: string,
    candidatePipelineId: string,
    delayDays: number,
  ) {
    const cp = await this.prisma.candidatePipeline.findFirst({
      where: { id: candidatePipelineId, candidate: { tenantId } },
    });
    if (!cp) throw new NotFoundException("Candidate pipeline not found");

    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + delayDays);

    return this.prisma.candidatePipeline.update({
      where: { id: candidatePipelineId },
      data: {
        lastContactAt: new Date(),
        nextFollowUpAt: nextFollowUp,
      },
    });
  }
}
