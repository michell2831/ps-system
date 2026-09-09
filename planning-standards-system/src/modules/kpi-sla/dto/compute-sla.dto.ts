import { IsNotEmpty, IsString, IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload EMS sends when a transaction is closed out (Contract B2 / PS022
 * step 1). PSS computes the working-day duration + OPCR Timeliness Score
 * and logs the result to sla_computation_log (BE2's table).
 */
export class ComputeSlaDto {
    @ApiProperty({ example: 'TXN-2026-00123', description: 'EMS-supplied transaction identifier' })
    @IsNotEmpty()
    @IsString()
    transaction_id: string;

    @ApiProperty({ example: 'a1b2c3d4-...' })
    @IsNotEmpty()
    @IsUUID()
    service_id: string;

    @ApiPropertyOptional({ example: 'OSAS', description: 'Office that owns the service; used to look up the active SLA rule' })
    @IsOptional()
    @IsString()
    office?: string;

    @ApiProperty({ example: '2026-06-01T08:00:00+08:00' })
    @IsISO8601()
    time_in: string;

    @ApiProperty({ example: '2026-06-03T14:30:00+08:00' })
    @IsISO8601()
    time_out: string;
}