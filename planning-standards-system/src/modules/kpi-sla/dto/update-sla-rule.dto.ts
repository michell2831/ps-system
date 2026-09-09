import { PartialType } from '@nestjs/mapped-types';
import { IsArray, ArrayMinSize, IsObject, IsOptional, Matches, Validate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSlaRuleDto, WorkEndAfterStartConstraint } from './create-sla-rule.dto';

export class UpdateSlaRuleDto extends PartialType(CreateSlaRuleDto) {
  // ── BE2-1: re-declared to attach WorkEndAfterStartConstraint explicitly ──
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'work_end_time must be HH:MM format' })
  @Validate(WorkEndAfterStartConstraint)
  work_end_time?: string;

  // ── BE2-2: re-declared to attach ArrayMinSize explicitly ─────────────────
  @ApiPropertyOptional({
    description:
      'Array of day/hour config objects for CUSTOM schedule. Must contain at least one entry.',
    example: [
      { day: 'Monday', is_working: true, start: '09:00', end: '18:00' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one working day must be configured.' })
  @IsObject({ each: true })
  work_schedule_config?: object[];
}
