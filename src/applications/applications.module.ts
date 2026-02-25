import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application, ApplicationSchema } from './application.schema';
import { OnboardingDocument, OnboardingDocumentSchema } from './onboarding-document.schema';
import { OnboardingService } from './onboarding.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoundsModule } from '../rounds/rounds.module';
import { OfferLettersModule } from '../offer-letters/offer-letters.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: OnboardingDocument.name, schema: OnboardingDocumentSchema },
    ]),
    NotificationsModule,
    forwardRef(() => RoundsModule),
    forwardRef(() => OfferLettersModule),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, OnboardingService],
  exports: [ApplicationsService, OnboardingService],
})
export class ApplicationsModule {}
