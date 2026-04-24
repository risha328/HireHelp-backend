import { IsUrl } from 'class-validator';

export class ExternalSyncDto {
  @IsUrl()
  googleSheetUrl: string;
}
