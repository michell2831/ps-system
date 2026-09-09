import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRevisionDto {
    @ApiProperty({
        example: 'Policy update requires new SLA targets for Q3.',
        description: 'Required reason for the revision request. Must not be empty or whitespace-only.',
    })
    @IsNotEmpty({ message: 'Revision reason is required.' })
    @IsString()
    @MinLength(10, { message: 'Revision reason must be at least 10 characters.' })
    reason: string;
}