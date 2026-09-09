import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    IsInt,
    IsArray,
    IsUUID,
    Min,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlaUnit, ReferralStatus } from '../enums';

export class CreateServiceDto {
    @ApiProperty({ example: 'Request for Transcript of Records' })
    @IsNotEmpty()
    @IsString()
    // BE1-2: normalize before validation � trim leading/trailing spaces and
    // collapse internal double (or more) spaces into a single space.
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    )
    @MinLength(3, { message: 'Service name must be at least 3 characters.' }) // BE1-1
    @MaxLength(100, { message: 'Service name must not exceed 100 characters.' }) // BE1-2
    @Matches(/^[^<>"\\`]+$/, { message: 'Service name contains invalid characters.' }) // BE1-4
    name: string;

    @ApiPropertyOptional({ example: 'For Follow-up', description: 'Service mode to distinguish same-named services' })
    @IsOptional()
    @IsString()
    @MaxLength(150, { message: 'Service mode must not exceed 150 characters.' })
    service_mode?: string;

    @ApiPropertyOptional({ example: 'OSAS' })
    @IsOptional()
    @IsString()
    sub_office?: string;

    // Task 4: classification is now free-text so non-medical offices
    // (Registrar, OSAS, etc.) can enter their own labels (e.g. "Walk-in",
    // "With Billing Statement") instead of being forced into the CSC
    // Simple/Complex/Highly Technical values.
    @ApiPropertyOptional({ example: 'Simple', description: 'Free-text classification label (e.g. "Simple", "Walk-in")' })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Classification must not exceed 100 characters.' })
    classification?: string;

    // BE1-3: SLA target must be a positive whole number (>= 1 working day).
    @ApiProperty({ example: 3, description: 'SLA target numeric value (interpreted with sla_target_unit)' })
    @IsInt({ message: 'SLA target must be a whole number.' })
    @Min(1, { message: 'SLA target must be at least 1 working day.' })
    sla_target_value: number;

    @ApiPropertyOptional({ enum: SlaUnit, default: SlaUnit.DAYS, description: 'Unit for SLA target: Minutes, Hours, or Days' })
    @IsOptional()
    @IsEnum(SlaUnit)
    sla_target_unit?: SlaUnit;

    @ApiProperty({ example: 'Records Section' })
    @IsNotEmpty()
    @IsString()
    responsible_unit: string;

    @ApiPropertyOptional({ example: ['Form 137', 'Valid ID'], description: 'List of required documents' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(500, { each: true, message: 'Each required document entry must not exceed 500 characters.' }) // BE1-5
    required_documents?: string[];

    @ApiPropertyOptional({ example: ['Submit form', 'Pay fees', 'Receive document'], description: 'Ordered processing steps' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(1000, { each: true, message: 'Each processing step must not exceed 1000 characters.' }) // BE1-5
    processing_steps?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(300, { message: 'Expected output must not exceed 300 characters.' }) // BE1-5
    expected_output?: string;

    @ApiPropertyOptional({ enum: ReferralStatus, default: ReferralStatus.WITH, description: 'Referral status: With, Without, or N/A' })
    @IsOptional()
    @IsEnum(ReferralStatus)
    with_referral?: ReferralStatus;

    // TT4: links this service to one or more standard service_modes
    // (Walk-in, Online, Email, Referral, Non-Referral, Phone) via the
    // service_service_modes join table. Distinct from the free-text
    // `service_mode` field above — this references the ServiceMode
    // reference table by id.
    @ApiPropertyOptional({
        type: [String],
        description: 'IDs of ServiceMode records to associate with this service (see GET /api/service-modes)',
        example: ['b3f1c2a0-1111-4a2b-9c3d-000000000001'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true, message: 'Each mode id must be a valid UUID.' })
    mode_ids?: string[];
}