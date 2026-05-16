import { Controller, Get, Param, Query } from "@nestjs/common";
import { PipelinesService } from "./pipelines.service";

@Controller("pipelines")
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Get()
  findAll(@Query("tenantId") tenantId: string) {
    return this.pipelinesService.findAll(tenantId);
  }

  @Get("stats")
  getStats(@Query("tenantId") tenantId: string) {
    return this.pipelinesService.getStats(tenantId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.pipelinesService.findOne(id);
  }
}
