import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { FollowUpsService } from "./follow-ups.service";

@Controller("follow-ups")
export class FollowUpsController {
  constructor(private followUpsService: FollowUpsService) {}

  @Get("rules/:stageId")
  getRules(@Param("stageId") stageId: string) {
    return this.followUpsService.getRulesForStage(stageId);
  }

  @Post("rules/:stageId")
  createRule(
    @Param("stageId") stageId: string,
    @Body()
    body: {
      delayDays: number;
      channelType: "EMAIL" | "SMS" | "ATS_MESSAGE";
      templateSubject?: string;
      templateBody: string;
      maxAttempts?: number;
      escalate?: boolean;
    },
  ) {
    return this.followUpsService.upsertRule(stageId, body);
  }

  @Post("trigger")
  triggerScan(@Body() body: { tenantId?: string }) {
    return this.followUpsService.scheduleOverdueFollowUps(body.tenantId);
  }
}
