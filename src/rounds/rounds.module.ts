import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { Round, RoundSchema } from './round.schema';
import { RoundEvaluation, RoundEvaluationSchema } from './round-evaluation.schema';
import { MCQResponse, MCQResponseSchema } from './mcq-response.schema';
import { QuestionBankItem, QuestionBankItemSchema } from './question-bank-item.schema';
import { QuestionSet, QuestionSetSchema } from './question-set.schema';
import { ExamSession, ExamSessionSchema } from './exam-session.schema';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleFormsService } from './google-forms.service';
import { UsersModule } from '../users/users.module';
import { Application, ApplicationSchema } from '../applications/application.schema';
import { RoundEventsListener } from './round-events.listener';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Round.name, schema: RoundSchema },
      { name: RoundEvaluation.name, schema: RoundEvaluationSchema },
      { name: MCQResponse.name, schema: MCQResponseSchema },
      { name: QuestionBankItem.name, schema: QuestionBankItemSchema },
      { name: QuestionSet.name, schema: QuestionSetSchema },
      { name: ExamSession.name, schema: ExamSessionSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    JobsModule,
    forwardRef(() => ApplicationsModule),
    CompaniesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [RoundsController],
  providers: [RoundsService, GoogleSheetsService, GoogleFormsService, RoundEventsListener],
  exports: [RoundsService],
})
export class RoundsModule {}
