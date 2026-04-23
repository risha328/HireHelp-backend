import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Application, ApplicationSchema } from '../applications/application.schema';
import { Company, CompanySchema } from '../companies/company.schema';
import { Job, JobSchema } from '../jobs/job.schema';
import { RoundEvaluation, RoundEvaluationSchema } from '../rounds/round-evaluation.schema';
import { User, UserSchema } from '../users/user.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    AnalyticsModule,
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: User.name, schema: UserSchema },
      { name: RoundEvaluation.name, schema: RoundEvaluationSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
