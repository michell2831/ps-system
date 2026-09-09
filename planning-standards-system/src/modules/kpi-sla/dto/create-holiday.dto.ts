import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayType } from '../enums';

export class CreateHolidayDto {
  @ApiProperty({ example: "New Year's Day" })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 1, description: 'Month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 1, description: 'Day of month (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiPropertyOptional({ example: 2026, description: 'Year (null = applies every year)' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiProperty({ enum: HolidayType, example: HolidayType.REGULAR })
  @IsEnum(HolidayType)
  type: HolidayType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;
}