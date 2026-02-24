import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import * as express from 'express';
import { OfferLetterService } from './offer-letter.service';

@Controller('offer-letters')
export class OfferLetterDownloadController {
  constructor(private readonly offerLetterService: OfferLetterService) {}

  /**
   * Public download endpoint. Link in email points here so the PDF is served
   * with a friendly filename (e.g. Offer-Letter-CompanyName-Position.pdf).
   */
  @Get('download')
  async download(@Query('token') token: string, @Res() res: express.Response) {
    if (!token) {
      throw new BadRequestException('Download token is required');
    }
    const { buffer, filename } = await this.offerLetterService.getOfferLetterForDownload(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
