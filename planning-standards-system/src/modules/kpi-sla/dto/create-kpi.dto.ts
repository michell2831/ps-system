import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUUID,
    IsBoolean,
    MinLength,
    MaxLength,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    ValidationOptions,
    registerDecorator,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpiCategory, KpiUnit } from '../enums';

// ─── BE1-8: unit-dependent target_value range ───────────────────────────────
// PERCENT → must be between 1 and 100 inclusive
// COUNT   → must not exceed 999999
// DAYS    → no extra bound beyond @IsPositive below
@ValidatorConstraint({ name: 'isValidKpiTargetValue', async: false })
class IsValidKpiTargetValueConstraint implements ValidatorConstraintInterface {
    validate(value: number, args: ValidationArguments): boolean {
        const obj = args.object as { unit?: KpiUnit };
        if (typeof value !== 'number' || Number.isNaN(value)) return true; // let @IsNumber handle this
        if (obj.unit === KpiUnit.PERCENT) {
            return value >= 1 && value <= 100;
        }
        if (obj.unit === KpiUnit.COUNT) {
            return value <= 999999;
        }
        return true;
    }

    defaultMessage(args: ValidationArguments): string {
        const obj = args.object as { unit?: KpiUnit };
        if (obj.unit === KpiUnit.PERCENT) {
            return 'Target value for percentage-based KPIs must be between 1 and 100.';
        }
        if (obj.unit === KpiUnit.COUNT) {
            return 'Target value for count-based KPIs must not exceed 999,999.';
        }
        return 'target_value is invalid for the given unit.';
    }
}

function IsValidKpiTargetValue(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidKpiTargetValueConstraint,
        });
    };
}
// ─────────────────────────────────────────────────────────────────────────────

export class CreateKpiDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sub_office?: string;

    @ApiPropertyOptional({ description: 'References a service in the service-catalogue microservice' })
    @IsOptional()
    @IsUUID()
    service_id?: string;

    // BE1-7: KPI name must be meaningful and bounded in length.
    @ApiProperty({ example: '% of transactions completed on time' })
    @IsNotEmpty()
    @IsString()
    @MinLength(3, { message: 'KPI name must be at least 3 characters.' })
    @MaxLength(150, { message: 'KPI name must not exceed 150 characters.' })
    name: string;

    @ApiProperty({ enum: KpiCategory, example: KpiCategory.EFFICIENCY })
    @IsEnum(KpiCategory)
    category: KpiCategory;

    // BE1-8: positive number, plus unit-dependent range (see IsValidKpiTargetValue above).
    @ApiProperty({ example: 95.0, description: 'Must be a positive number' })
    @IsNumber()
    @IsPositive({ message: 'target_value must be a positive number.' })
    @IsValidKpiTargetValue()
    target_value: number;

    // BE1-9: unit is required — without it, the KPI cannot be evaluated.
    @ApiProperty({ enum: KpiUnit, example: KpiUnit.PERCENT })
    @IsNotEmpty({ message: 'KPI unit is required.' })
    @IsEnum(KpiUnit, { message: 'KPI unit is required.' })
    unit: KpiUnit;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}