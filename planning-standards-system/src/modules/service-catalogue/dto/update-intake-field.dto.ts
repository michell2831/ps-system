import { PartialType } from '@nestjs/mapped-types';
import { CreateIntakeFieldDto } from './create-intake-field.dto';

export class UpdateIntakeFieldDto extends PartialType(CreateIntakeFieldDto) {}
