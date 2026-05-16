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

    // Upsert pipelines and candidates into DB
    for (const pipeline of result.pipelines) {
      const dbPipeline = await this.prisma.pipeline.upsert({
        where: {
          id: `${tenantId}_${pipeline.atsId}`, // pseudo-unique
        },
        create: {
          tenantId,
          name: pipeline.name,
          atsSource: adapterId,
          atsId: pipeline.atsId,
        },
        update: {
          name: pipeline.name,
        },
      });

      for (const stage of pipeline.stages) {
        await this.prisma.stage.upsert({
          where: { id: `${dbPipeline.id}_${stage.atsId}` },
          create: {
            id: `${dbPipeline.id}_${stage.atsId}`,
            pipelineId: dbPipeline.id,
            name: stage.name,
            order: stage.order,
          },
          update: { name: stage.name, order: stage.order },
        });
      }
    }

    for (const candidate of result.candidates) {
      await this.prisma.candidate.upsert({
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
    }

    return {
      pipelines: result.pipelines.length,
      candidates: result.candidates.length,
      errors: result.errors,
    };
  }
}
