import { PartialType } from '@nestjs/mapped-types';
import { CreateCommitmentDto } from './create-commitment.dto';

export class UpdateCommitmentDto extends PartialType(CreateCommitmentDto) {}
