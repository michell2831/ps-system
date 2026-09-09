import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNaFlagDto {
    @ApiProperty()
    @IsUUID()
    period_id: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'reason is required and cannot be blank' })
    @MinLength(10)
    @MaxLength(200)
    reason: string;
}