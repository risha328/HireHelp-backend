import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { Round, RoundSchema } from './round.schema';
import { RoundEvaluation, RoundEvaluationSchema } from './round-evaluation.schema';
import { MCQResponse, MCQResponseSchema } from './mcq-response.schema';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleFormsService } from './google-forms.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Round.name, schema: RoundSchema },
      { name: RoundEvaluation.name, schema: RoundEvaluationSchema },
      { name: MCQResponse.name, schema: MCQResponseSchema }
    ]),
    JobsModule,
    forwardRef(() => ApplicationsModule),
    NotificationsModule,
  ],
  controllers: [RoundsController],
  providers: [RoundsService, GoogleSheetsService, GoogleFormsService],
  exports: [RoundsService],
})
export class RoundsModule {}
