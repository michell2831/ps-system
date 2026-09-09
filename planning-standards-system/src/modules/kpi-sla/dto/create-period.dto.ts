import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PeriodType } from '../enums';


@ValidatorConstraint({ name: 'startBeforeEnd', async: false })
class StartBeforeEndConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments): boolean {
    const obj = args.object as CreatePeriodDto;
    if (!obj.start_date || !obj.end_date) return true;
    return new Date(obj.start_date) < new Date(obj.end_date);
  }

  defaultMessage(): string {
    return 'start_date must be before end_date';
  }
}

export class CreatePeriodDto {
  @ApiProperty({ example: 'Q1 FY 2025' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: PeriodType })
  @IsEnum(PeriodType)
  period_type: PeriodType;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  @Validate(StartBeforeEndConstraint)
  start_date: string;

  @ApiProperty({ example: '2025-03-31' })
  @IsDateString()
  end_date: string;
}