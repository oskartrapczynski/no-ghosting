import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { FollowUpsService } from "./follow-ups.service";
import { TenantId } from "../auth/tenant.decorator";
import { CreateFollowUpRuleDto } from "./follow-ups.dto";

@Controller("follow-ups")
export class FollowUpsController {
  constructor(private followUpsService: FollowUpsService) {}

  @Get("rules/:stageId")
  getRules(
    @TenantId() tenantId: string,
    @Param("stageId") stageId: string,
  ) {
    return this.followUpsService.getRulesForStage(tenantId, stageId);
  }

  @Post("rules/:stageId")
  createRule(
    @TenantId() tenantId: string,
    @Param("stageId") stageId: string,
    @Body() body: CreateFollowUpRuleDto,
  ) {
    return this.followUpsService.upsertRule(tenantId, stageId, body);
  }

  @Post("trigger")
  triggerScan(@TenantId() tenantId: string) {
    return this.followUpsService.scheduleOverdueFollowUps(tenantId);
  }
}
