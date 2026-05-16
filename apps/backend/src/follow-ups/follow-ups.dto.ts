import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateFollowUpRuleDto {
  @IsInt()
  @Min(0)
  @Max(365)
  delayDays!: number;

  @IsIn(["EMAIL", "SMS", "ATS_MESSAGE"])
  channelType!: "EMAIL" | "SMS" | "ATS_MESSAGE";

  @IsOptional()
  @IsString()
  templateSubject?: string;

  @IsString()
  templateBody!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  escalate?: boolean;
}
