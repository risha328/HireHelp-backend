import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/application.schema';
import { Round, RoundDocument, RoundType } from './round.schema';
import { EmailService } from '../notifications/email.service';
import { RoundEvents } from './rounds.service';

@Injectable()
export class RoundEventsListener {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent(RoundEvents.ROUND_ASSIGNED)
  async onRoundAssigned(payload: any) {
    if (payload?.externalLink && payload?.candidateEmail) {
      await this.emailService.sendMcqRoundEmail(
        payload.candidateEmail,
        payload.candidateName || 'Candidate',
        payload.jobTitle || 'Job',
        payload.companyName || 'Company',
        payload.externalLink,
        payload.roundName || 'MCQ Round',
      );
    }
  }

  @OnEvent(RoundEvents.ROUND_STARTED)
  onRoundStarted(payload: any) {
    console.log('ROUND_STARTED', payload);
  }

  @OnEvent(RoundEvents.ROUND_SUBMITTED)
  onRoundSubmitted(payload: any) {
    console.log('ROUND_SUBMITTED', payload);
  }

  @OnEvent(RoundEvents.ROUND_PASSED)
  async onRoundPassed(payload: any) {
    if (!payload?.applicationId) return;
    const application = await this.applicationModel
      .findById(payload.applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) return;
    const round = payload.roundId ? await this.roundModel.findById(payload.roundId).exec() : null;
    await this.emailService.sendNextRoundEmail(
      (application.candidateId as any).email,
      (application.candidateId as any).name,
      (application.jobId as any).title,
      (application.companyId as any).name,
      round?.name || 'Next round',
    );
  }

  @OnEvent(RoundEvents.ROUND_FAILED)
  async onRoundFailed(payload: any) {
    if (!payload?.applicationId) return;
    const application = await this.applicationModel
      .findById(payload.applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) return;
    const round = payload.roundId ? await this.roundModel.findById(payload.roundId).exec() : null;
    if (round?.type === RoundType.MCQ) {
      await this.emailService.sendMcqRejectionEmail(
        (application.candidateId as any).email,
        (application.candidateId as any).name,
        (application.jobId as any).title,
        (application.companyId as any).name,
      );
    }
  }
}
