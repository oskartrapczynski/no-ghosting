import { Injectable, Logger } from "@nestjs/common";
import {
  listAdapters,
  getAdapter,
  registerAdapter,
  demoAdapter,
} from "@no-ghosting/adapters";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdaptersService {
  private readonly logger = new Logger(AdaptersService.name);

  constructor(private prisma: PrismaService) {
    // Register built-in adapters
    registerAdapter(demoAdapter);
  }

  listAvailable() {
    return listAdapters().map((a) => ({ id: a.id, name: a.name }));
  }

  async testConnection(adapterId: string, config: Record<string, unknown>) {
    const adapter = getAdapter(adapterId);
    if (!adapter) throw new Error(`Adapter "${adapterId}" not found`);
    return adapter.testConnection(config);
  }

  async sync(adapterId: string, tenantId: string, config: Record<string, unknown>) {
    const adapter = getAdapter(adapterId);
    if (!adapter) throw new Error(`Adapter "${adapterId}" not found`);

    const result = await adapter.sync(config);
    this.logger.log(
      `Synced ${result.pipelines.length} pipelines, ${result.candidates.length} candidates from ${adapter.name}`,
    );

    // Build a map of pipeline atsId -> DB pipeline (with stages)
    const pipelineMap = new Map<string, { id: string; stageMap: Map<string, string> }>();

    for (const pipeline of result.pipelines) {
      const dbPipeline = await this.prisma.pipeline.upsert({
        where: {
          id: `${tenantId}_${pipeline.atsId}`,
        },
        create: {
          id: `${tenantId}_${pipeline.atsId}`,
          tenantId,
          name: pipeline.name,
          atsSource: adapterId,
          atsId: pipeline.atsId,
        },
        update: {
          name: pipeline.name,
        },
      });

      const stageMap = new Map<string, string>();
      for (const stage of pipeline.stages) {
        const stageId = `${dbPipeline.id}_${stage.atsId}`;
        await this.prisma.stage.upsert({
          where: { id: stageId },
          create: {
            id: stageId,
            pipelineId: dbPipeline.id,
            name: stage.name,
            order: stage.order,
          },
          update: { name: stage.name, order: stage.order },
        });
        stageMap.set(stage.atsId, stageId);
      }

      pipelineMap.set(pipeline.atsId, { id: dbPipeline.id, stageMap });
    }

    // Upsert candidates and link them to pipelines
    let linked = 0;
    for (const candidate of result.candidates) {
      const dbCandidate = await this.prisma.candidate.upsert({
        where: {
          email_tenantId: { email: candidate.email, tenantId },
        },
        create: {
          tenantId,
          email: candidate.email,
          name: candidate.name,
          phone: candidate.phone,
          atsId: candidate.atsId,
        },
        update: {
          name: candidate.name,
          phone: candidate.phone,
        },
      });

      // Create CandidatePipeline junction if candidate has pipeline + stage info
      if (candidate.pipelineAtsId && candidate.currentStage) {
        const pipelineInfo = pipelineMap.get(candidate.pipelineAtsId);
        if (pipelineInfo) {
          const stageId = pipelineInfo.stageMap.get(candidate.currentStage);
          if (stageId) {
            // Look up first active follow-up rule for this stage to calculate nextFollowUpAt
            const rule = await this.prisma.followUpRule.findFirst({
              where: { stageId, active: true },
              orderBy: { delayDays: "asc" },
            });

            const nextFollowUpAt = new Date();
            nextFollowUpAt.setDate(nextFollowUpAt.getDate() + (rule?.delayDays ?? 3));

            await this.prisma.candidatePipeline.upsert({
              where: {
                candidateId_pipelineId: {
                  candidateId: dbCandidate.id,
                  pipelineId: pipelineInfo.id,
                },
              },
              create: {
                candidateId: dbCandidate.id,
                pipelineId: pipelineInfo.id,
                currentStageId: stageId,
                lastContactAt: new Date(),
                nextFollowUpAt,
                status: "ACTIVE",
              },
              update: {
                currentStageId: stageId,
              },
            });
            linked++;
          }
        }
      }
    }

    this.logger.log(`Linked ${linked} candidates to pipelines`);

    return {
      pipelines: result.pipelines.length,
      candidates: result.candidates.length,
      linked,
      errors: result.errors,
    };
  }
}
