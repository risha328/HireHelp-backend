import { IsNotEmpty, IsString } from 'class-validator';

export class FetchGoogleSheetDto {
  @IsNotEmpty()
  @IsString()
  googleSheetUrl: string;
}
