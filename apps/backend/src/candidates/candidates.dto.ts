import { IsInt, Max, Min } from "class-validator";

export class MarkContactedDto {
  @IsInt()
  @Min(0)
  @Max(365)
  delayDays!: number;
}
