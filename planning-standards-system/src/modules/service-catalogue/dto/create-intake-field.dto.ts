import { IsEnum, IsBoolean, IsInt, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType } from '../enums';

export class CreateIntakeFieldDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: FieldType })
  @IsEnum(FieldType)
  field_type: FieldType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  dropdown_options?: string[];
}