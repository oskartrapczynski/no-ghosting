import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FollowUpsService } from "./follow-ups.service";

@Injectable()
export class FollowUpsScheduler {
  private readonly logger = new Logger(FollowUpsScheduler.name);

  constructor(private followUpsService: FollowUpsService) {}

  /** Run every 15 minutes: check for overdue follow-ups and enqueue them */
  @Cron(CronExpression.EVERY_QUARTER)
  async handleCron() {
    this.logger.log("Scanning for overdue follow-ups...");
    const result = await this.followUpsService.scheduleOverdueFollowUps();
    this.logger.log(`Scheduled ${result.scheduled} follow-ups`);
  }
}
