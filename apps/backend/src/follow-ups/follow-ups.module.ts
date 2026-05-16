import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { FollowUpsController } from "./follow-ups.controller";
import { FollowUpsService } from "./follow-ups.service";
import { FollowUpsProcessor } from "./follow-ups.processor";
import { FollowUpsScheduler } from "./follow-ups.scheduler";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "follow-ups",
    }),
  ],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, FollowUpsProcessor, FollowUpsScheduler],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
