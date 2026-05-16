import { Controller, Get, Param } from "@nestjs/common";
import { PipelinesService } from "./pipelines.service";
import { TenantId } from "../auth/tenant.decorator";

@Controller("pipelines")
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.pipelinesService.findAll(tenantId);
  }

  @Get("stats")
  getStats(@TenantId() tenantId: string) {
    return this.pipelinesService.getStats(tenantId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.pipelinesService.findOne(id);
  }
}
