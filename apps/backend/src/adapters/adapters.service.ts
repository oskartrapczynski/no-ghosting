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

  async sync(
    adapterId: string,
    tenantId: string,
    config: Record<string, unknown>,
  ) {
    const adapter = getAdapter(adapterId);
    if (!adapter) throw new Error(`Adapter "${adapterId}" not found`);

    const result = await adapter.sync(config);
    this.logger.log(
      `Synced ${result.pipelines.length} pipelines, ${result.recruiters.length} recruiters, ${result.candidates.length} candidates from ${adapter.name}`,
    );

    // Recruiters — upsert by (atsId, tenantId), fall back to email
    const recruiterByAtsId = new Map<string, string>(); // ats id -> db id
    for (const r of result.recruiters) {
      const existing = await this.prisma.recruiter.findFirst({
        where: { tenantId, OR: [{ atsId: r.atsId }, { email: r.email }] },
      });
      const dbRecruiter = existing
        ? await this.prisma.recruiter.update({
            where: { id: existing.id },
            data: { email: r.email, name: r.name, atsId: r.atsId },
          })
        : await this.prisma.recruiter.create({
            data: {
              tenantId,
              email: r.email,
              name: r.name,
              atsId: r.atsId,
            },
          });
      recruiterByAtsId.set(r.atsId, dbRecruiter.id);
    }

    // Pipelines + stages
    const pipelineMap = new Map<
      string,
      { id: string; stageMap: Map<string, string> }
    >();

    for (const pipeline of result.pipelines) {
      let dbPipeline = await this.prisma.pipeline.findFirst({
        where: { tenantId, atsId: pipeline.atsId },
      });

      if (dbPipeline) {
        dbPipeline = await this.prisma.pipeline.update({
          where: { id: dbPipeline.id },
          data: { name: pipeline.name },
        });
      } else {
        dbPipeline = await this.prisma.pipeline.create({
          data: {
            tenantId,
            name: pipeline.name,
            atsSource: adapterId,
            atsId: pipeline.atsId,
          },
        });
      }

      const stageMap = new Map<string, string>();
      for (const stage of pipeline.stages) {
        let dbStage = await this.prisma.stage.findFirst({
          where: { pipelineId: dbPipeline.id, name: stage.name },
        });
        if (dbStage) {
          dbStage = await this.prisma.stage.update({
            where: { id: dbStage.id },
            data: { name: stage.name, order: stage.order },
          });
        } else {
          dbStage = await this.prisma.stage.create({
            data: {
              pipelineId: dbPipeline.id,
              name: stage.name,
              order: stage.order,
            },
          });
        }
        stageMap.set(stage.atsId, dbStage.id);
      }

      pipelineMap.set(pipeline.atsId, { id: dbPipeline.id, stageMap });
    }

    // Candidates + linking
    let linked = 0;
    for (const candidate of result.candidates) {
      const dbCandidate = await this.prisma.candidate.upsert({
        where: { email_tenantId: { email: candidate.email, tenantId } },
        create: {
          tenantId,
          email: candidate.email,
          name: candidate.name,
          phone: candidate.phone,
          atsId: candidate.atsId,
        },
        update: { name: candidate.name, phone: candidate.phone },
      });

      if (candidate.pipelineAtsId && candidate.currentStage) {
        const pipelineInfo = pipelineMap.get(candidate.pipelineAtsId);
        if (pipelineInfo) {
          const stageId = pipelineInfo.stageMap.get(candidate.currentStage);
          if (stageId) {
            const rule = await this.prisma.followUpRule.findFirst({
              where: { stageId, active: true },
              orderBy: { delayDays: "asc" },
            });

            const lastContactAt = candidate.appliedAt ?? new Date();
            const nextFollowUpAt = new Date(lastContactAt);
            nextFollowUpAt.setDate(
              nextFollowUpAt.getDate() + (rule?.delayDays ?? 3),
            );

            const recruiterId = candidate.assignedRecruiterAtsId
              ? (recruiterByAtsId.get(candidate.assignedRecruiterAtsId) ?? null)
              : null;

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
                assignedRecruiterId: recruiterId,
                lastContactAt,
                nextFollowUpAt,
                status: "ACTIVE",
              },
              update: {
                currentStageId: stageId,
                assignedRecruiterId: recruiterId,
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
      recruiters: result.recruiters.length,
      candidates: result.candidates.length,
      linked,
      errors: result.errors,
    };
  }
}
