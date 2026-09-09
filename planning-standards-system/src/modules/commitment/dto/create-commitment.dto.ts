import {
    IsNotEmpty,
    IsString,
    IsArray,
    ValidateNested,
    IsOptional,
    IsNumber,
    IsEnum,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommitmentItemUnit } from '../enums';

export class CreateCommitmentItemDto {
    @ApiProperty({ example: 'service-uuid' })
    @IsNotEmpty()
    @IsString()
    service_id: string;

    @ApiProperty({ example: 'kpi-uuid' })
    @IsNotEmpty()
    @IsString()
    kpi_id: string;

    @ApiPropertyOptional({ example: 95.5, description: 'Nullable in draft mode — partial saves allowed' })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: 'target_value must be a positive number' })
    target_value?: number;

    @ApiPropertyOptional({ enum: CommitmentItemUnit, default: CommitmentItemUnit.COUNT })
    @IsOptional()
    @IsEnum(CommitmentItemUnit)
    unit?: CommitmentItemUnit;
}

export class CreateCommitmentDto {
    @ApiProperty({ example: 'period-uuid' })
    @IsNotEmpty()
    @IsString()
    period_id: string;

    @ApiProperty({ type: [CreateCommitmentItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCommitmentItemDto)
    items: CreateCommitmentItemDto[];
}