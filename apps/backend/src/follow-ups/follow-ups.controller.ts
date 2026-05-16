import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { FollowUpsService } from './follow-ups.service'
import { TenantId } from '../auth/tenant.decorator'
import { CreateFollowUpRuleDto, UpdateFollowUpRuleDto } from './follow-ups.dto'

@Controller('follow-ups')
export class FollowUpsController {
  constructor(private followUpsService: FollowUpsService) {}

  @Get('rules/:stageId')
  getRules(@TenantId() tenantId: string, @Param('stageId') stageId: string) {
    return this.followUpsService.getRulesForStage(tenantId, stageId)
  }

  @Post('rules/:stageId')
  createRule(
    @TenantId() tenantId: string,
    @Param('stageId') stageId: string,
    @Body() body: CreateFollowUpRuleDto,
  ) {
    return this.followUpsService.upsertRule(tenantId, stageId, body)
  }

  @Patch('rules/by-id/:ruleId')
  updateRule(
    @TenantId() tenantId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: UpdateFollowUpRuleDto,
  ) {
    return this.followUpsService.updateRule(tenantId, ruleId, body)
  }

  @Delete('rules/by-id/:ruleId')
  deleteRule(@TenantId() tenantId: string, @Param('ruleId') ruleId: string) {
    return this.followUpsService.deleteRule(tenantId, ruleId)
  }

  @Post('trigger')
  triggerScan(@TenantId() tenantId: string) {
    return this.followUpsService.scheduleOverdueFollowUps(tenantId)
  }
}
