import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class GetServicesQueryDto extends PaginationDto {
  // Task 4: classification is now free text, not an enum — was
  // `@IsEnum(ServiceClassification)`. Filtering by classification now
  // does a plain string match against whatever the office entered.
  @ApiPropertyOptional({ description: 'Filter by classification (free text, exact match)' })
  @IsOptional()
  @IsString()
  classification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_archived?: boolean;
}
