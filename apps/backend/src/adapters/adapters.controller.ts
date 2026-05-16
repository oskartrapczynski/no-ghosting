import { Controller, Get, Post, Body, Logger, HttpException } from "@nestjs/common";
import { AdaptersService } from "./adapters.service";

@Controller("adapters")
export class AdaptersController {
  constructor(private adaptersService: AdaptersService) {}

  @Get()
  listAvailable() {
    return this.adaptersService.listAvailable();
  }

  @Post("test")
  testConnection(
    @Body() body: { adapterId: string; config: Record<string, unknown> },
  ) {
    return this.adaptersService.testConnection(body.adapterId, body.config);
  }

  @Post("sync")
  async sync(
    @Body()
    body: {
      adapterId: string;
      tenantId: string;
      config: Record<string, unknown>;
    },
  ) {
    try {
      return await this.adaptersService.sync(body.adapterId, body.tenantId, body.config);
    } catch (err: any) {
      Logger.error(err);
      throw new HttpException(err.message || "Sync failed", 500);
    }
  }
}
