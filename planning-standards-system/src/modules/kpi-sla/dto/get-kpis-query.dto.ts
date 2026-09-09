import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';
import { KpiCategory } from '../enums';

export class GetKpisQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service_id?: string;

  @ApiPropertyOptional({ enum: KpiCategory })
  @IsOptional()
  @IsEnum(KpiCategory)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  include_inactive?: string;
}
