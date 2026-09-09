import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

export class GetCommitmentsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by period ID' })
  @IsOptional()
  @IsString()
  period_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status (Draft / Locked)', enum: ['Draft', 'Locked'] })
  @IsOptional()
  @IsIn(['Draft', 'Locked'])
  status?: string;
}
