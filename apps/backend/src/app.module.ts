import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { PipelinesModule } from "./pipelines/pipelines.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { AdaptersModule } from "./adapters/adapters.module";
import { HealthModule } from "./health/health.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { TenantGuard } from "./auth/tenant.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    PipelinesModule,
    CandidatesModule,
    FollowUpsModule,
    AdaptersModule,
    WebhooksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: TenantGuard }],
})
export class AppModule {}
