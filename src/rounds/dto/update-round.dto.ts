import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUrl } from 'class-validator';
import { CreateRoundDto } from './create-round.dto';

export class UpdateRoundDto extends PartialType(CreateRoundDto) {
  @IsOptional()
  @IsUrl()
  googleFormLink?: string;

  @IsOptional()
  @IsUrl()
  googleSheetLink?: string;
}
