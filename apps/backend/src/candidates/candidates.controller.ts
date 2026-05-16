import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { CandidatesService } from "./candidates.service";
import { TenantId } from "../auth/tenant.decorator";
import { MarkContactedDto } from "./candidates.dto";

@Controller("candidates")
export class CandidatesController {
  constructor(private candidatesService: CandidatesService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
  ) {
    return this.candidatesService.findAll(tenantId, status);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.candidatesService.findOne(tenantId, id);
  }

  @Post(":candidatePipelineId/contacted")
  markContacted(
    @TenantId() tenantId: string,
    @Param("candidatePipelineId") candidatePipelineId: string,
    @Body() body: MarkContactedDto,
  ) {
    return this.candidatesService.markContacted(
      tenantId,
      candidatePipelineId,
      body.delayDays,
    );
  }
}
