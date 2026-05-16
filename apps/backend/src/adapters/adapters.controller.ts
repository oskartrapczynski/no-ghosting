import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  HttpException,
} from "@nestjs/common";
import { AdaptersService } from "./adapters.service";
import { TenantId } from "../auth/tenant.decorator";
import { SyncDto, TestConnectionDto } from "./adapters.dto";

@Controller("adapters")
export class AdaptersController {
  private readonly logger = new Logger(AdaptersController.name);

  constructor(private adaptersService: AdaptersService) {}

  @Get()
  listAvailable() {
    return this.adaptersService.listAvailable();
  }

  @Post("test")
  testConnection(@Body() body: TestConnectionDto) {
    return this.adaptersService.testConnection(body.adapterId, body.config);
  }

  @Post("sync")
  async sync(@TenantId() tenantId: string, @Body() body: SyncDto) {
    try {
      return await this.adaptersService.sync(
        body.adapterId,
        tenantId,
        body.config,
      );
    } catch (err: any) {
      this.logger.error(err?.stack ?? err);
      throw new HttpException(err?.message || "Sync failed", 500);
    }
  }
}
