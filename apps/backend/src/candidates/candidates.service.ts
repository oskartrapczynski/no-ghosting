import { Injectable } from "@nestjs/common";
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
            followUpLogs: { orderBy: { sentAt: "desc" }, take: 5 },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        pipelines: {
          include: {
            pipeline: true,
            stage: true,
            followUpLogs: { orderBy: { sentAt: "desc" } },
          },
        },
      },
    });
  }

  /** Mark that recruiter contacted the candidate (resets follow-up timer) */
  async markContacted(candidatePipelineId: string, delayDays: number) {
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
