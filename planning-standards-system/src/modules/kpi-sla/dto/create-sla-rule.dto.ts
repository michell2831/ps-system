import {
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Matches,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkScheduleType } from '../enums';

// ─── Existing constraint (unchanged) ────────────────────────────────────────

@ValidatorConstraint({ name: 'warnLessThanOverdue', async: false })
class WarnLessThanOverdueConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments): boolean {
    const obj = args.object as CreateSlaRuleDto;
    return obj.warn_threshold_pct < obj.overdue_threshold_pct;
  }

  defaultMessage(): string {
    return 'warn_threshold_pct must be less than overdue_threshold_pct';
  }
}

// ─── BE2-1: Time ordering constraint ────────────────────────────────────────

@ValidatorConstraint({ name: 'workEndAfterStart', async: false })
export class WorkEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments): boolean {
    const obj = args.object as { work_start_time?: string; work_end_time?: string };
    const start = obj.work_start_time;
    const end   = obj.work_end_time;
    if (start === undefined || end === undefined) return true;
    return end > start;
  }

  defaultMessage(): string {
    return 'work_end_time must be after work_start_time';
  }
}

// ─── DTO ────────────────────────────────────────────────────────────────────

export class CreateSlaRuleDto {
  @ApiProperty({ enum: WorkScheduleType, example: WorkScheduleType.WEEKDAYS })
  @IsEnum(WorkScheduleType)
  work_schedule_type: WorkScheduleType;

  @ApiPropertyOptional({
    description:
      'Required when work_schedule_type is CUSTOM. ' +
      'Array of day/hour config objects. Must contain at least one entry.',
    example: [
      { day: 'Monday',   is_working: true, start: '08:00', end: '17:00' },
      { day: 'Saturday', is_working: true, start: '08:00', end: '12:00' },
    ],
  })
  @IsOptional()
  @IsArray()                                                           // BE2-2: reject non-arrays
  @ArrayMinSize(1, { message: 'At least one working day must be configured.' }) // BE2-2
  @IsObject({ each: true })
  work_schedule_config?: object[];

  @ApiProperty({ example: '08:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'work_start_time must be HH:MM format' })
  work_start_time: string;

  @ApiProperty({ example: '17:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'work_end_time must be HH:MM format' })
  @Validate(WorkEndAfterStartConstraint) // BE2-1
  work_end_time: string;

  @ApiProperty({ example: 75, description: 'Must be less than overdue_threshold_pct' })
  @IsInt()
  @Min(1)
  @Max(99)
  @Validate(WarnLessThanOverdueConstraint)
  warn_threshold_pct: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  overdue_threshold_pct: number;
}
