import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { CandidatesService } from "./candidates.service";

@Controller("candidates")
export class CandidatesController {
  constructor(private candidatesService: CandidatesService) {}

  @Get()
  findAll(
    @Query("tenantId") tenantId: string,
    @Query("status") status?: string,
  ) {
    return this.candidatesService.findAll(tenantId, status);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.candidatesService.findOne(id);
  }

  @Post(":candidatePipelineId/contacted")
  markContacted(
    @Param("candidatePipelineId") candidatePipelineId: string,
    @Body() body: { delayDays: number },
  ) {
    return this.candidatesService.markContacted(
      candidatePipelineId,
      body.delayDays,
    );
  }
}
