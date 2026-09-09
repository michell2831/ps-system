import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateReportDto {
    @ApiProperty({ example: 'b3f1c9d0-1234-4a5b-8c6d-abcdef123456', description: 'Commitment ID to export' })
    @IsUUID()
    commitment_id: string;

    @ApiProperty({ example: 'PDF', enum: ['PDF', 'CSV'] })
    @IsNotEmpty()
    @IsString()
    @IsIn(['PDF', 'CSV'])
    format: 'PDF' | 'CSV';
}