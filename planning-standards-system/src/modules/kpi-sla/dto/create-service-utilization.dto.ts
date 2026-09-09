import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Task 9 / Contract B3 — payload EMS submits to record a quarterly
 * aggregated transaction count for a service. Upserts on
 * (service_name, quarter, year).
 */
export class CreateServiceUtilizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service_id?: string;

  @ApiProperty({ example: 'Good Moral Certificate' })
  @IsNotEmpty()
  @IsString()
  service_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  office?: string;

  @ApiProperty({ example: 'Q1' })
  @IsNotEmpty()
  @IsString()
  quarter: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  year: number;

  @ApiProperty({ example: 47 })
  @IsInt()
  @Min(0)
  transaction_count: number;

  @ApiPropertyOptional({ example: 'EMS' })
  @IsOptional()
  @IsString()
  source?: string;
}
