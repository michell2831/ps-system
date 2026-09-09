import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

/**
 * Task 9 — read-only, paginated query for the SLA Computation Monitor log.
 * Inherits page / limit / sort_by / sort_order from PaginationDto (Task 7).
 */
export class GetSlaLogsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transaction_id?: string;
}
