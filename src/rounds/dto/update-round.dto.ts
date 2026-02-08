import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUrl, ValidateIf } from 'class-validator';
import { CreateRoundDto } from './create-round.dto';

export class UpdateRoundDto extends PartialType(CreateRoundDto) {
  @IsOptional()
  @ValidateIf((o) => o.googleFormLink && o.googleFormLink !== '')
  @IsUrl()
  googleFormLink?: string;

  @IsOptional()
  @ValidateIf((o) => o.googleSheetLink && o.googleSheetLink !== '')
  @IsUrl()
  googleSheetLink?: string;
}
