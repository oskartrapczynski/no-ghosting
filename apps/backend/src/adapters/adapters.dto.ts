import { IsObject, IsString } from "class-validator";

export class TestConnectionDto {
  @IsString()
  adapterId!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

export class SyncDto {
  @IsString()
  adapterId!: string;

  @IsObject()
  config!: Record<string, unknown>;
}
