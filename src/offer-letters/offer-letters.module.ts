import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/application.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OfferLetterController } from './offer-letter.controller';
import { OfferLetterDownloadController } from './offer-letter-download.controller';
import { OfferLetterService } from './offer-letter.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
    CloudinaryModule,
    NotificationsModule,
  ],
  controllers: [OfferLetterController, OfferLetterDownloadController],
  providers: [PdfGeneratorService, OfferLetterService],
  exports: [OfferLetterService],
})
export class OfferLettersModule {}
