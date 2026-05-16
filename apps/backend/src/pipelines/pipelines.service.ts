import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: { followUpRules: true },
        },
      },
    });
    if (!pipeline) throw new NotFoundException("Pipeline not found");
    return pipeline;
  }

  async getStats(tenantId: string) {
    const [total, active, ghosted] = await Promise.all([
      this.prisma.candidatePipeline.count({
        where: { pipeline: { tenantId } },
      }),
      this.prisma.candidatePipeline.count({
        where: { pipeline: { tenantId }, status: "ACTIVE" },
      }),
      this.prisma.candidatePipeline.count({
        where: { pipeline: { tenantId }, status: "GHOSTED" },
      }),
    ]);

    return {
      total,
      active,
      ghosted,
      responseRate: total > 0 ? ((total - ghosted) / total) * 100 : 100,
    };
  }
}
