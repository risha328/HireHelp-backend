import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Round, RoundDocument, RoundType, MCQMode } from './round.schema';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { JobsService } from '../jobs/jobs.service';
import { RoundEvaluation, RoundEvaluationDocument, EvaluationStatus } from './round-evaluation.schema';
import { MCQResponse, MCQResponseDocument } from './mcq-response.schema';
import { ApplicationsService } from '../applications/applications.service';
import { CompaniesService } from '../companies/companies.service';
import { EmailService } from '../notifications/email.service';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleFormsService } from './google-forms.service';
import { SubmitMcqDto } from './dto/submit-mcq.dto';
import { QuestionBankItem, QuestionBankItemDocument } from './question-bank-item.schema';
import { QuestionSet, QuestionSetDocument } from './question-set.schema';
import { ExamSession, ExamSessionDocument, ExamSessionStatus } from './exam-session.schema';
import { UsersService } from '../users/users.service';
import { CreateQuestionBankItemDto } from './dto/create-question-bank-item.dto';
import { UpdateQuestionBankItemDto } from './dto/update-question-bank-item.dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';

export const RoundEvents = {
  ROUND_ASSIGNED: 'round.assigned',
  ROUND_STARTED: 'round.started',
  ROUND_SUBMITTED: 'round.submitted',
  ROUND_PASSED: 'round.passed',
  ROUND_FAILED: 'round.failed',
} as const;

@Injectable()
export class RoundsService {
  private getCompanyObjectId(companyId: string): Types.ObjectId {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid company context for this request');
    }
    return new Types.ObjectId(companyId);
  }

  private getCompanyObjectIdOrNull(companyId?: string): Types.ObjectId | null {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      return null;
    }
    return new Types.ObjectId(companyId);
  }

  private normalizeRoundConfig<T extends CreateRoundDto | UpdateRoundDto>(roundDto: T): T {
    if (roundDto.type === RoundType.MCQ) {
      if (!roundDto.mode) {
        roundDto.mode = roundDto.externalLink || roundDto.googleFormLink ? MCQMode.EXTERNAL : MCQMode.INTERNAL;
      }
      if (roundDto.mode === MCQMode.EXTERNAL) {
        roundDto.externalLink = roundDto.externalLink || roundDto.googleFormLink;
      }
      if (roundDto.mode === MCQMode.INTERNAL && !roundDto.passPercentage) {
        roundDto.passPercentage = 60;
      }
      if (roundDto.mode === MCQMode.INTERNAL && roundDto.autoSubmit === undefined) {
        roundDto.autoSubmit = true;
      }
    }
    return roundDto;
  }

  private parseDurationMinutes(round: RoundDocument | Round): number {
    if (round.durationMinutes && round.durationMinutes > 0) {
      return round.durationMinutes;
    }
    if (!round.duration) return 60;
    const match = round.duration.match(/(\d+)/);
    return match ? Math.max(1, Number(match[1])) : 60;
  }

  private async getQuestionSetQuestions(round: RoundDocument): Promise<QuestionBankItemDocument[]> {
    if (!round.questionSetId) return [];
    const questionSet = await this.questionSetModel.findById(round.questionSetId).exec();
    if (!questionSet || !questionSet.questionIds.length) return [];
    return this.questionBankModel.find({ _id: { $in: questionSet.questionIds } }).exec();
  }

  private async findLatestExamSession(
    roundId: string,
    applicationId: string,
    candidateId: string,
  ): Promise<ExamSessionDocument | null> {
    let session = await this.examSessionModel.findOne({
      roundId,
      applicationId,
      candidateId,
    }).sort({ createdAt: -1 }).exec();

    if (!session) {
      session = await this.examSessionModel.findOne({
        roundId,
        applicationId,
      }).sort({ createdAt: -1 }).exec();

      if (session && session.candidateId?.toString() !== candidateId) {
        throw new ForbiddenException('You are not allowed to access this exam session');
      }
    }

    return session;
  }

  constructor(
    @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
    @InjectModel(RoundEvaluation.name) private roundEvaluationModel: Model<RoundEvaluationDocument>,
    @InjectModel(MCQResponse.name) private mcqResponseModel: Model<MCQResponseDocument>,
    @InjectModel(QuestionBankItem.name) private questionBankModel: Model<QuestionBankItemDocument>,
    @InjectModel(QuestionSet.name) private questionSetModel: Model<QuestionSetDocument>,
    @InjectModel(ExamSession.name) private examSessionModel: Model<ExamSessionDocument>,
    private readonly jobsService: JobsService,
    @Inject(forwardRef(() => ApplicationsService))
    private readonly applicationsService: ApplicationsService,
    private readonly companiesService: CompaniesService,
    private readonly emailService: EmailService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleFormsService: GoogleFormsService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(createRoundDto: CreateRoundDto): Promise<Round> {
    try {
      this.normalizeRoundConfig(createRoundDto);
      // Validate that job exists
      const job = await this.jobsService.findOne(createRoundDto.jobId);
      if (!job) {
        throw new NotFoundException(`Job with ID ${createRoundDto.jobId} not found`);
      }

      // Set order if not provided
      if (createRoundDto.order === undefined) {
        const lastRound = await this.roundModel
          .findOne({ jobId: createRoundDto.jobId })
          .sort({ order: -1 })
          .exec();
        createRoundDto.order = lastRound ? lastRound.order + 1 : 0;
      }

      const createdRound = new this.roundModel(createRoundDto);
      const savedRound = await createdRound.save();

      // Send emails to interviewers if any
      if (createRoundDto.interviewers && createRoundDto.interviewers.length > 0) {
        const dateStr = createRoundDto.scheduledAt
          ? new Date(createRoundDto.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'TBD';

        const timeStr = createRoundDto.scheduledAt
          ? new Date(createRoundDto.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : 'TBD';

        let roundTypeStr = 'Interview';
        if (createRoundDto.type) {
          if (createRoundDto.type.toString().toLowerCase() === 'hr') {
            roundTypeStr = 'HR Interview';
          } else {
            roundTypeStr = createRoundDto.type.charAt(0).toUpperCase() + createRoundDto.type.slice(1).replace(/_/g, ' ') + ' Interview';
          }
        }

        for (const interviewer of createRoundDto.interviewers) {
          await this.emailService.sendInterviewerAssignmentEmail(
            interviewer.email,
            interviewer.name,
            '[Candidate Name]', // Placeholder as requested since rounds involve multiple candidates
            job.title, // Use job.title from the fetched job
            '[Fresher / X years]',
            dateStr,
            timeStr,
            createRoundDto.interviewMode || 'Offline',
            createRoundDto.platform || '',
            createRoundDto.instructions || '',
            roundTypeStr,
            createRoundDto.scheduling?.reportingTime,
            createRoundDto.locationDetails
          );
        }
      }

      return savedRound;
    } catch (error) {
      console.error('Error creating round:', error);
      throw error;
    }
  }

  async findAll(): Promise<Round[]> {
    return this.roundModel.find({ isArchived: false }).populate('jobId').exec();
  }

  async findByJob(jobId: string): Promise<Round[]> {
    return this.roundModel
      .find({ jobId, isArchived: false })
      .sort({ order: 1 })
      .populate('jobId')
      .exec();
  }

  async findOne(id: string): Promise<Round | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid round id');
    }
    return this.roundModel.findById(id).populate('jobId').exec();
  }

  async update(id: string, updateRoundDto: UpdateRoundDto): Promise<Round | null> {
    this.normalizeRoundConfig(updateRoundDto);
    return this.roundModel.findByIdAndUpdate(id, updateRoundDto, { new: true }).exec();
  }

  async remove(id: string): Promise<Round | null> {
    return this.roundModel.findByIdAndDelete(id).exec();
  }

  async archive(id: string): Promise<Round | null> {
    return this.roundModel.findByIdAndUpdate(
      id,
      { isArchived: true, archivedAt: new Date() },
      { new: true },
    ).exec();
  }

  async activate(id: string): Promise<Round | null> {
    return this.roundModel.findByIdAndUpdate(
      id,
      { isArchived: false, archivedAt: null },
      { new: true },
    ).exec();
  }

  async assignCandidateToRound(roundId: string, applicationId: string, evaluatorId: string): Promise<RoundEvaluationDocument> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) {
      throw new NotFoundException(`Round with ID ${roundId} not found`);
    }

    const application = await this.applicationsService.findOne(applicationId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Create round evaluation
    const roundEvaluation = new this.roundEvaluationModel({
      roundId,
      applicationId,
      evaluatorId,
      status: EvaluationStatus.PENDING,
      assignedInterviewers: round.interviewers || [], // Assign all interviewers from the round
    });

    const savedEvaluation = await roundEvaluation.save();

    const externalAssessmentLink = round.externalLink || round.googleFormLink;

    // If it's an interview round, send emails to assigned interviewers
    if (round.type === RoundType.INTERVIEW || round.type === RoundType.TECHNICAL || round.type === RoundType.HR) {
      if (savedEvaluation.assignedInterviewers && savedEvaluation.assignedInterviewers.length > 0) {
        try {
          const dateStr = round.scheduledAt
            ? new Date(round.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'TBD';

          const timeStr = round.scheduledAt
            ? new Date(round.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'TBD';

          let roundTypeStr = 'Interview';
          if (round.type) {
            if (round.type.toString().toLowerCase() === 'hr') {
              roundTypeStr = 'HR Interview';
            } else {
              roundTypeStr = round.type.charAt(0).toUpperCase() + round.type.slice(1).replace(/_/g, ' ') + ' Interview';
            }
          }

          for (const interviewer of savedEvaluation.assignedInterviewers) {
            await this.emailService.sendInterviewerAssignmentEmail(
              interviewer.email,
              interviewer.name,
              (application.candidateId as any).name,
              (application.jobId as any).title,
              '[Fresher / X years]', // Placeholder since experience not stored
              dateStr,
              timeStr,
              round.interviewMode || 'Offline',
              round.platform || '',
              round.instructions || '',
              roundTypeStr,
              round.scheduling?.reportingTime,
              round.locationDetails
            );
          }
        } catch (error) {
          console.error('Failed to send interviewer assignment email:', error);
        }
      }
    }

    const populated = await savedEvaluation.populate(['roundId', 'applicationId', 'evaluatorId']);
    this.eventEmitter.emit(RoundEvents.ROUND_ASSIGNED, {
      roundId: round._id.toString(),
      roundName: round.name,
      jobTitle: (application.jobId as any).title,
      companyName: (application.companyId as any).name,
      candidateId: (application.candidateId as any)._id?.toString?.() || application.candidateId?.toString(),
      candidateEmail: (application.candidateId as any).email,
      candidateName: (application.candidateId as any).name,
      mode: round.mode || MCQMode.INTERNAL,
      externalLink: externalAssessmentLink,
    });
    return populated;
  }

  async updateEvaluationStatus(
    evaluationId: string,
    status: EvaluationStatus,
    notes?: string,
    feedback?: string,
    score?: number,
    recommendation?: 'hire' | 'hold' | 'reject'
  ): Promise<RoundEvaluationDocument> {
    const evaluation = await this.roundEvaluationModel.findById(evaluationId).exec();
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${evaluationId} not found`);
    }

    evaluation.status = status;
    if (notes) evaluation.notes = notes;
    if (feedback) evaluation.feedback = feedback;
    if (score !== undefined) evaluation.score = score;
    if (recommendation) evaluation.recommendation = recommendation;

    if (status === EvaluationStatus.COMPLETED || status === EvaluationStatus.PASSED || status === EvaluationStatus.FAILED) {
      evaluation.completedAt = new Date();
    }

    const updatedEvaluation = await evaluation.save();
    this.eventEmitter.emit(RoundEvents.ROUND_SUBMITTED, {
      evaluationId: evaluation._id.toString(),
      roundId: evaluation.roundId.toString(),
      applicationId: evaluation.applicationId.toString(),
      status,
      score,
    });

    // Map recommendation to ApplicationStatus and update application
    if (recommendation) {
      const statusMap: Record<string, string> = {
        'hire': 'HIRED',
        'hold': 'HOLD',
        'reject': 'REJECTED'
      };

      const appStatus = statusMap[recommendation];
      if (appStatus) {
        await this.applicationsService.updateStatus(evaluation.applicationId.toString(), appStatus);
      }
    }

    // If passed, assign to next round
    if (status === EvaluationStatus.PASSED) {
      this.eventEmitter.emit(RoundEvents.ROUND_PASSED, {
        evaluationId: evaluation._id.toString(),
        roundId: evaluation.roundId.toString(),
        applicationId: evaluation.applicationId.toString(),
      });
      await this.assignToNextRound(evaluation.applicationId.toString(), evaluation.roundId.toString());
    } else if (status === EvaluationStatus.FAILED) {
      this.eventEmitter.emit(RoundEvents.ROUND_FAILED, {
        evaluationId: evaluation._id.toString(),
        roundId: evaluation.roundId.toString(),
        applicationId: evaluation.applicationId.toString(),
      });
    }

    return updatedEvaluation.populate(['roundId', 'applicationId', 'evaluatorId']);
  }

  private async assignToNextRound(applicationId: string, currentRoundId: string): Promise<void> {
    const currentRound = await this.roundModel.findById(currentRoundId).exec();
    if (!currentRound) return;

    const nextRound = await this.roundModel
      .findOne({
        jobId: currentRound.jobId,
        order: { $gt: currentRound.order },
        isArchived: false,
      })
      .sort({ order: 1 })
      .exec();

    if (nextRound) {
      // Find an evaluator (for now, use the first one - this might need to be improved)
      const application = await this.applicationsService.findOne(applicationId);
      const evaluatorId = (application.companyId as any)._id || application.companyId;

      await this.assignCandidateToRound(nextRound._id.toString(), applicationId, evaluatorId.toString());

      // Send next round notification email
      try {
        await this.emailService.sendNextRoundEmail(
          (application.candidateId as any).email,
          (application.candidateId as any).name,
          (application.jobId as any).title,
          (application.companyId as any).name,
          nextRound.name,
        );
      } catch (error) {
        console.error('Failed to send next round email:', error);
      }
    }
  }

  async getRoundEvaluations(roundId: string): Promise<RoundEvaluation[]> {
    return this.roundEvaluationModel
      .find({ roundId })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
          { path: 'companyId', select: 'name' },
        ],
      })
      .populate('evaluatorId', 'name email')
      .exec();
  }

  async submitMcqResponse(roundId: string, applicationId: string, submitMcqDto: SubmitMcqDto): Promise<MCQResponse> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) {
      throw new NotFoundException(`Round with ID ${roundId} not found`);
    }

    if (round.type !== RoundType.MCQ || !round.mcqQuestions) {
      throw new NotFoundException(`Round ${roundId} is not an MCQ round or has no questions`);
    }

    const application = await this.applicationsService.findOne(applicationId);
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Check if response already exists
    const existingResponse = await this.mcqResponseModel.findOne({ roundId, applicationId }).exec();
    if (existingResponse) {
      throw new NotFoundException(`MCQ response already submitted for this application and round`);
    }

    // Validate answers length
    if (submitMcqDto.answers.length !== round.mcqQuestions.length) {
      throw new NotFoundException(`Number of answers does not match number of questions`);
    }

    // Calculate score
    let correctCount = 0;
    const isCorrect: boolean[] = [];
    for (let i = 0; i < round.mcqQuestions.length; i++) {
      const isCorrectAnswer = submitMcqDto.answers[i] === round.mcqQuestions[i].correctAnswer;
      isCorrect.push(isCorrectAnswer);
      if (isCorrectAnswer) correctCount++;
    }
    const score = (correctCount / round.mcqQuestions.length) * 100;

    const mcqResponse = new this.mcqResponseModel({
      roundId,
      applicationId,
      candidateId: application.candidateId,
      answers: submitMcqDto.answers,
      isCorrect,
      score,
      isSubmitted: true,
      submittedAt: new Date(),
    });

    return await mcqResponse.save();
  }

  async getMcqResponses(roundId: string): Promise<MCQResponse[]> {
    const responses = await this.mcqResponseModel
      .find({ roundId, isSubmitted: true })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
        ],
      })
      .exec();

    const existingApplicationIds = new Set(
      responses
        .map((r: any) => ((r.applicationId as any)?._id?.toString?.() || r.applicationId?.toString?.()))
        .filter(Boolean),
    );

    // Also fetch evaluations for this round to capture synced scores from external sources
    const evaluations = await this.roundEvaluationModel
      .find({
        roundId,
        score: { $exists: true, $ne: null },
      })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
        ],
      })
      .exec();

    const evaluationsAsResponses = evaluations
      .filter((ev: any) => {
        const appId = (ev.applicationId as any)?._id?.toString?.() || ev.applicationId?.toString?.();
        return appId && !existingApplicationIds.has(appId);
      })
      .map((ev: any) => ({
        _id: `eval-${ev._id}`,
        roundId: ev.roundId,
        applicationId: ev.applicationId,
        score: ev.score,
        isSubmitted: true,
        submittedAt: ev.completedAt || ev.updatedAt,
        createdAt: ev.createdAt,
        updatedAt: ev.updatedAt,
        source: 'evaluation',
      }));

    evaluationsAsResponses.forEach((r: any) => {
      const appId = (r.applicationId as any)?._id?.toString?.() || r.applicationId?.toString?.();
      if (appId) existingApplicationIds.add(appId);
    });

    const submittedSessions = await this.examSessionModel
      .find({
        roundId,
        $or: [
          { status: { $in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.TIMEOUT_SUBMITTED] } },
          { submittedAt: { $exists: true, $ne: null } },
        ],
      })
      .sort({ submittedAt: -1, createdAt: -1 })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
        ],
      })
      .exec();

    const round = await this.roundModel.findById(roundId).exec();
    const uniqueQuestionIds = Array.from(
      new Set(
        submittedSessions
          .flatMap((session) => (session.questionOrder || []).map((qid) => qid.toString()))
          .filter((id) => Types.ObjectId.isValid(id)),
      ),
    ).map((id) => new Types.ObjectId(id));

    const bankQuestions = uniqueQuestionIds.length
      ? await this.questionBankModel.find({ _id: { $in: uniqueQuestionIds } }).select('_id correctAnswer').exec()
      : [];
    const bankQuestionMap = new Map(bankQuestions.map((q: any) => [q._id.toString(), q.correctAnswer]));

    const inlineQuestionMap = new Map(
      (round?.mcqQuestions || []).map((q, idx) => [new Types.ObjectId(`${idx + 1}`.padStart(24, '0')).toString(), q.correctAnswer]),
    );

    const syntheticResponses = submittedSessions
      .filter((session: any) => {
        const appId = (session.applicationId as any)?._id?.toString?.() || session.applicationId?.toString?.();
        if (!appId) return true;
        return !existingApplicationIds.has(appId);
      })
      .map((session: any) => {
        const isCorrect = (session.questionOrder || []).map((qid: any, idx: number) => {
          const qidStr = qid.toString();
          const correctAnswer = bankQuestionMap.get(qidStr) ?? inlineQuestionMap.get(qidStr);
          const selected = session.answers?.[idx];
          return typeof correctAnswer === 'number' && selected >= 0 && selected === correctAnswer;
        });
        const correctCount = isCorrect.filter(Boolean).length;
        const total = (session.questionOrder || []).length || (session.answers || []).length || 0;
        const computedScore = total ? (correctCount / total) * 100 : 0;

        return {
          _id: `session-${session._id}`,
          roundId: { _id: roundId, name: round?.name, googleFormLink: round?.googleFormLink },
          applicationId: session.applicationId,
          candidateId: session.candidateId,
          answers: session.answers || [],
          isCorrect,
          score: typeof session.score === 'number' ? session.score : computedScore,
          isSubmitted: true,
          submittedAt: session.submittedAt || session.updatedAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        } as any;
      });

    return [...responses, ...evaluationsAsResponses, ...syntheticResponses].sort((a: any, b: any) => {
      const aTime = new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime();
      const bTime = new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  async getTopPerformers(roundId: string, jobId: string, limit = 10): Promise<any[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 10;
    const responses = (await this.getMcqResponses(roundId)) as any[];

    const ranked = responses
      .filter((response) => {
        if (!response?.isSubmitted) return false;
        const responseJobId =
          (response.applicationId as any)?.jobId?._id?.toString?.() ||
          (response.applicationId as any)?.jobId?.toString?.();
        return responseJobId === jobId;
      })
      .sort((a, b) => {
        const scoreA = typeof a?.score === 'number' ? a.score : 0;
        const scoreB = typeof b?.score === 'number' ? b.score : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const aTime = new Date(a?.submittedAt || a?.updatedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.submittedAt || b?.updatedAt || b?.createdAt || 0).getTime();
        return aTime - bTime;
      })
      .slice(0, safeLimit)
      .map((response, index) => ({
        rank: index + 1,
        candidateName: response?.applicationId?.candidateId?.name || 'Unknown Candidate',
        candidateEmail: response?.applicationId?.candidateId?.email || '',
        applicationId: response?.applicationId?._id?.toString?.() || response?.applicationId?.toString?.() || '',
        roundId: response?.roundId?._id?.toString?.() || response?.roundId?.toString?.() || roundId,
        jobId,
        score: typeof response?.score === 'number' ? response.score : 0,
        submittedAt: response?.submittedAt || response?.updatedAt || response?.createdAt || null,
        answers: response?.answers || [],
        isCorrect: response?.isCorrect || [],
      }));

    return ranked;
  }

  async getMcqStatus(roundId: string, applicationId: string): Promise<{ submitted: boolean; score?: number }> {
    const latestSession = await this.examSessionModel
      .findOne({ roundId, applicationId })
      .sort({ createdAt: -1 })
      .exec();

    const sessionStatus = String(latestSession?.status || '').toLowerCase();
    const isSubmittedSession =
      sessionStatus === ExamSessionStatus.SUBMITTED || sessionStatus === ExamSessionStatus.TIMEOUT_SUBMITTED;

    if (!isSubmittedSession) {
      return { submitted: false };
    }

    if (typeof latestSession?.score === 'number') {
      return { submitted: true, score: latestSession.score };
    }

    const response = await this.mcqResponseModel.findOne({ roundId, applicationId }).exec();
    return { submitted: true, score: response?.score };
  }

  async getMcqStatusByApplication(applicationId: string): Promise<{ submitted: boolean; score?: number }> {
    const latestSession = await this.examSessionModel
      .findOne({ applicationId })
      .sort({ submittedAt: -1, createdAt: -1 })
      .exec();

    const sessionStatus = String(latestSession?.status || '').toLowerCase();
    const isSubmittedSession =
      sessionStatus === ExamSessionStatus.SUBMITTED || sessionStatus === ExamSessionStatus.TIMEOUT_SUBMITTED;

    if (isSubmittedSession) {
      if (typeof latestSession?.score === 'number') {
        return { submitted: true, score: latestSession.score };
      }
      return { submitted: true };
    }

    const response = await this.mcqResponseModel.findOne({ applicationId }).sort({ submittedAt: -1, createdAt: -1 }).exec();
    if (!response) {
      return { submitted: false };
    }
    return { submitted: true, score: response.score };
  }

  async fetchGoogleSheetData(googleSheetUrl: string): Promise<any[]> {
    // Extract spreadsheet ID from Google Sheets URL
    const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/|$)/);
    if (!sheetIdMatch) {
      throw new NotFoundException('Invalid Google Sheets URL');
    }
    const spreadsheetId = sheetIdMatch[1];

    // Fetch all sheet data
    const sheetData = await this.googleSheetsService.getSheetData(spreadsheetId);
    return sheetData;
  }

  async getAllMcqResponses(companyId?: string): Promise<any[]> {
    const scopedRoundFilter: any = { type: RoundType.MCQ, googleFormLink: { $exists: true, $ne: null } };
    if (companyId) {
      const companyJobs = await this.jobsService.findByCompany(companyId);
      scopedRoundFilter.jobId = { $in: companyJobs.map((j: any) => j._id) };
    }
    // Get all MCQ rounds with Google Form links
    const mcqRounds = await this.roundModel
      .find(scopedRoundFilter)
      .populate('jobId')
      .exec();

    const allResponses: any[] = [];

    // Get database responses
    const dbResponses = await this.mcqResponseModel
      .find(companyId ? { roundId: { $in: mcqRounds.map((r) => r._id) } } : {})
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
        ],
      })
      .populate('roundId', 'name googleFormLink')
      .exec();

    allResponses.push(...dbResponses);

    // Fetch Google Forms data for each MCQ round
    for (const round of mcqRounds) {
      try {
        if (round.googleFormLink) {
          // Extract form ID from Google Forms URL
          const formIdMatch = round.googleFormLink.match(/\/forms\/d\/([a-zA-Z0-9-_]+)(?:\/|$)/);
          if (formIdMatch) {
            const formId = formIdMatch[1];
            const formResponses = await this.googleFormsService.getFormResponses(formId);

            // Process Google Forms responses
            for (let i = 0; i < formResponses.length; i++) {
              const response = formResponses[i];
              if (response.answers) {
                // Extract email from the response (assuming it's in the first question or a specific field)
                // Google Forms responses structure varies, so this might need adjustment
                const email = response.respondentEmail || response.answers[0]?.textAnswers?.answers[0]?.value;

                if (email) {
                  // Find application by candidate email
                  const application = await this.applicationsService.findByCandidateEmail(email);
                  if (application) {
                    // Check if we already have this response in database
                    const existingResponse = dbResponses.find(
                      r => (r.applicationId as any)._id.toString() === (application as any)._id.toString() &&
                        (r.roundId as any)._id.toString() === round._id.toString()
                    );

                    if (!existingResponse) {
                      // Convert form answers to our format
                      const answers: number[] = [];
                      const numQuestions = round.mcqQuestions?.length || 0;

                      // Process answers from Google Forms response
                      for (let j = 0; j < numQuestions; j++) {
                        const answerText = response.answers[j]?.textAnswers?.answers[0]?.value?.toString().toUpperCase();
                        if (answerText) {
                          // Convert answer text to index (assuming options are A, B, C, D)
                          const answerIndex = answerText.charCodeAt(0) - 65; // A=0, B=1, etc.
                          answers.push(answerIndex);
                        } else {
                          answers.push(-1); // Invalid answer
                        }
                      }

                      // Calculate score if we have the correct answers
                      let score = 0;
                      if (round.mcqQuestions && answers.length === round.mcqQuestions.length) {
                        let correctCount = 0;
                        for (let k = 0; k < answers.length; k++) {
                          if (answers[k] === round.mcqQuestions[k].correctAnswer) {
                            correctCount++;
                          }
                        }
                        score = (correctCount / answers.length) * 100;
                      }

                      // Use response timestamp
                      const timestamp = response.lastSubmittedTime ? new Date(response.lastSubmittedTime) : new Date();

                      allResponses.push({
                        _id: `form_${formId}_${i}`,
                        roundId: round,
                        applicationId: application,
                        answers,
                        score,
                        isSubmitted: true,
                        submittedAt: timestamp,
                        source: 'google_forms'
                      } as any);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Continue with other rounds even if one fails
      }
    }


    /*
    * Get evaluations by application ID
    */
    return allResponses;
  }

  /*
  * Get evaluations by application ID
  */
  /*
  * Get evaluations by application ID
  */
  async getEvaluationsByApplications(applicationIds: string[]): Promise<RoundEvaluationDocument[]> {
    // 1. Fetch existing evaluations with populated fields
    const evaluations = await this.roundEvaluationModel.find({
      applicationId: { $in: applicationIds }
    })
      .populate(['roundId', 'applicationId', 'evaluatorId'])  // Populate everything
      .exec();

    // 2. Self-healing: Ensure every application with a currentRound has a corresponding evaluation
    // Fetch all applications to check their currentRound status
    const applications = await Promise.all(
      applicationIds.map(id => this.applicationsService.findOne(id).catch(() => null))
    );

    const validApplications = applications.filter(app => app !== null);
    const missingEvaluations: RoundEvaluationDocument[] = [];

    for (const app of validApplications) {
      if (app.currentRound) {
        const roundId = (app.currentRound as any)._id?.toString() || app.currentRound.toString();

        // Check if evaluation exists for this app and round
        const exists = evaluations.find(
          e => {
            // Handle populated applicationId and roundId
            const eAppId = (e.applicationId as any)._id ? (e.applicationId as any)._id.toString() : e.applicationId.toString();
            const eRoundId = (e.roundId as any)._id ? (e.roundId as any)._id.toString() : e.roundId.toString();

            return eAppId === (app as any)._id.toString() && eRoundId === roundId;
          }
        );

        if (!exists) {
          // Missing evaluation detected! Create it using a company admin as evaluator.
          try {
            console.log(`Self-healing: Creating missing evaluation for App ${(app as any)._id}, Round ${roundId}`);
            const companyId = ((app as any).companyId?._id || (app as any).companyId)?.toString();
            if (!companyId) continue;
            const admins = await this.companiesService.getCompanyAdmins(companyId);
            const evaluatorId = admins?.length > 0 ? (admins[0] as any)._id?.toString() : null;
            if (!evaluatorId) {
              console.error(`Self-healing: No company admin for company ${companyId}, skipping evaluation create`);
              continue;
            }
            const newEvaluation = await this.assignCandidateToRound(
              roundId,
              (app as any)._id.toString(),
              evaluatorId
            );
            missingEvaluations.push(newEvaluation);
          } catch (err) {
            console.error(`Failed to auto-create evaluation for App ${(app as any)._id}:`, err);
          }
        }
      }
    }

    // Combine existing and newly created evaluations
    const allEvaluations = [...evaluations, ...missingEvaluations];

    const now = new Date();
    const updatedEvaluations: RoundEvaluationDocument[] = [];

    // All evaluations are now populated, so we can access round details directly
    for (const evaluation of allEvaluations) {
      let isUpdated = false;
      const round = evaluation.roundId as any; // Cast to access properties

      // Check for missed interview
      if (evaluation.status === EvaluationStatus.PENDING) {
        let scheduledDate: Date | null = null;

        if (evaluation.scheduledAt) {
          scheduledDate = new Date(evaluation.scheduledAt);
        } else if (round && round.scheduledAt) {
          scheduledDate = new Date(round.scheduledAt);
        } else if (round && round.scheduling && round.scheduling.interviewDate) {
          // Combine date and time
          const dateStr = round.scheduling.interviewDate;
          const timeStr = round.scheduling.interviewTime || '09:00';

          scheduledDate = new Date(`${dateStr}T${timeStr}`);

          if (isNaN(scheduledDate.getTime())) {
            scheduledDate = new Date(dateStr);
          }
        }

        if (scheduledDate && !isNaN(scheduledDate.getTime()) && scheduledDate < now) {
          evaluation.status = EvaluationStatus.MISSED;
          isUpdated = true;
        }
      }

      if (isUpdated) {
        await evaluation.save();
      }
      updatedEvaluations.push(evaluation);
    }


    return updatedEvaluations;
  }

  /**
   * Ensure an evaluation exists for (applicationId, roundId). Create one if missing so scheduling can proceed.
   */
  async ensureEvaluationForSchedule(applicationId: string, roundId: string): Promise<RoundEvaluationDocument> {
    const existing = await this.roundEvaluationModel
      .findOne({ applicationId, roundId })
      .populate(['roundId', 'applicationId', 'evaluatorId'])
      .exec();
    if (existing) return existing;

    const application = await this.applicationsService.findOne(applicationId);
    const companyId = (application.companyId as any)?._id?.toString() || (application.companyId as any)?.toString();
    if (!companyId) throw new NotFoundException('Application has no company');

    const admins = await this.companiesService.getCompanyAdmins(companyId);
    const evaluatorId = admins.length > 0 ? (admins[0] as any)._id.toString() : null;
    if (!evaluatorId) throw new NotFoundException('No company admin found to assign as evaluator');

    return this.assignCandidateToRound(roundId, applicationId, evaluatorId);
  }

  async assignInterviewer(
    evaluationId: string,
    data: {
      interviewerId: string;
      interviewerName: string;
      interviewerEmail: string;
      scheduledAt: string;
      interviewMode: string;
      interviewType: string;
      platform?: string;
      meetingLink?: string;
      duration?: string;
      reportingTime?: string;
      locationDetails?: any;
    }
  ): Promise<RoundEvaluationDocument> {
    const evaluation = await this.roundEvaluationModel.findById(evaluationId).exec();
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${evaluationId} not found`);
    }

    // Update evaluation with scheduling details
    evaluation.evaluatorId = data.interviewerId as any;
    evaluation.assignedInterviewers = [{
      name: data.interviewerName,
      email: data.interviewerEmail
    }];
    evaluation.scheduledAt = new Date(data.scheduledAt);
    evaluation.interviewMode = data.interviewMode;
    evaluation.interviewType = data.interviewType;
    evaluation.platform = data.platform;
    evaluation.meetingLink = data.meetingLink;
    evaluation.duration = data.duration;
    evaluation.locationDetails = data.locationDetails;
    evaluation.status = EvaluationStatus.SCHEDULED; // Ensure status is scheduled when scheduled

    const updatedEvaluation = await evaluation.save();

    // Fetch details for email
    const application = await this.applicationsService.findOne(evaluation.applicationId.toString());
    const round = await this.roundModel.findById(evaluation.roundId).exec();
    const job = await this.jobsService.findOne((application.jobId as any)._id || application.jobId);
    const company = (application.companyId as any);

    if (application && round && job) {
      try {
        const dateStr = new Date(data.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(data.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // Determine interview type display name (avoid "Interview Interview" when round type is generic 'interview')
        let interviewTypeDisplay = data.interviewType || 'Interview';
        if (round.type) {
          const rt = round.type.toString().toLowerCase();
          if (rt === 'hr') interviewTypeDisplay = 'HR Interview';
          else if (rt === 'technical') interviewTypeDisplay = 'Technical Interview';
          else if (rt === 'interview') interviewTypeDisplay = 'Interview';
          else interviewTypeDisplay = round.type.charAt(0).toUpperCase() + round.type.slice(1).replace(/_/g, ' ') + ' Interview';
        }

        // Calculate reporting time if not provided (15 minutes before interview time for offline)
        let reportingTimeStr = data.reportingTime;
        if (!reportingTimeStr && data.interviewMode === 'in-person') {
          const scheduledDate = new Date(data.scheduledAt);
          const reportingDate = new Date(scheduledDate.getTime() - 15 * 60000); // 15 minutes before
          reportingTimeStr = reportingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        const candidateEmail = (application.candidateId as any).email;
        const candidateName = (application.candidateId as any).name;
        const companyName = company.name || 'HireHelp';
        const experience = 'N/A'; // Placeholder

        // Send email to CANDIDATE
        await this.emailService.sendCandidateInterviewScheduledEmail(
          candidateEmail,
          candidateName,
          job.title,
          interviewTypeDisplay,
          dateStr,
          timeStr,
          data.interviewMode,
          data.platform,
          data.meetingLink,
          reportingTimeStr,
          companyName,
          data.locationDetails,
          company.contactEmail || 'hirehelp23@gmail.com',
          company.contactPhone
        );

        // Send email to INTERVIEWER
        await this.emailService.sendInterviewerScheduledEmail(
          data.interviewerEmail,
          data.interviewerName,
          candidateName,
          job.title,
          experience,
          interviewTypeDisplay,
          dateStr,
          timeStr,
          data.interviewMode,
          data.platform,
          data.meetingLink,
          reportingTimeStr,
          companyName,
          data.locationDetails,
          company.contactEmail || 'hirehelp23@gmail.com'
        );

        console.log(`✅ Interview scheduled emails sent to candidate (${candidateEmail}) and interviewer (${data.interviewerEmail})`);
      } catch (error) {
        console.error('Failed to send interview scheduled emails:', error);
      }
    }

    return updatedEvaluation;
  }

  async rescheduleRound(
    evaluationId: string,
    rescheduleData: {
      scheduledAt: string;
      notes?: string;
      interviewMode?: string;
      platform?: string;
      meetingLink?: string;
      duration?: string;
      reportingTime?: string;
      locationDetails?: any;
    }
  ): Promise<RoundEvaluation> {
    // Find the evaluation
    const evaluation = await this.roundEvaluationModel.findById(evaluationId);

    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${evaluationId} not found`);
    }

    // Check if the evaluation is in a state that can be rescheduled
    const allowedStatuses = [EvaluationStatus.MISSED, EvaluationStatus.SCHEDULED];
    if (!allowedStatuses.includes(evaluation.status)) {
      throw new Error(`Cannot reschedule interview. Current status is ${evaluation.status}, expected 'missed' or 'scheduled'`);
    }

    // Update the evaluation with new schedule details
    evaluation.scheduledAt = new Date(rescheduleData.scheduledAt);
    evaluation.status = EvaluationStatus.SCHEDULED; // Return to scheduled status

    if (rescheduleData.interviewMode) evaluation.interviewMode = rescheduleData.interviewMode;
    if (rescheduleData.platform) evaluation.platform = rescheduleData.platform;
    if (rescheduleData.meetingLink) evaluation.meetingLink = rescheduleData.meetingLink;
    if (rescheduleData.duration) evaluation.duration = rescheduleData.duration;
    if (rescheduleData.locationDetails) evaluation.locationDetails = rescheduleData.locationDetails;

    // Add notes
    if (rescheduleData.notes) {
      evaluation.notes = evaluation.notes
        ? `${evaluation.notes}\n\n[Rescheduled] ${rescheduleData.notes}`
        : `[Rescheduled] ${rescheduleData.notes}`;
    }

    const updatedEvaluation = await evaluation.save();

    // TRIGGER EMAILS
    try {
      // Fetch details for email
      const application = await this.applicationsService.findOne(evaluation.applicationId.toString());
      const round = await this.roundModel.findById(evaluation.roundId).exec();
      const job = await this.jobsService.findOne((application.jobId as any)._id || application.jobId);
      const company = (application.companyId as any);

      if (application && round && job) {
        const dateStr = new Date(rescheduleData.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(rescheduleData.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // Determine interview type display name (avoid "Interview Interview" when round type is generic 'interview')
        let interviewTypeDisplay = evaluation.interviewType || 'Interview';
        if (round.type) {
          const rt = round.type.toString().toLowerCase();
          if (rt === 'hr') interviewTypeDisplay = 'HR Interview';
          else if (rt === 'technical') interviewTypeDisplay = 'Technical Interview';
          else if (rt === 'interview') interviewTypeDisplay = 'Interview';
          else interviewTypeDisplay = round.type.charAt(0).toUpperCase() + round.type.slice(1).replace(/_/g, ' ') + ' Interview';
        }

        const candidateEmail = (application.candidateId as any).email;
        const candidateName = (application.candidateId as any).name;
        const companyName = company.name || 'HireHelp';

        // Get interviewer details from evaluation (since they were already assigned before it became "missed")
        const interviewer = evaluation.assignedInterviewers && evaluation.assignedInterviewers.length > 0
          ? evaluation.assignedInterviewers[0]
          : null;

        // Send email to CANDIDATE
        await this.emailService.sendCandidateInterviewRescheduledEmail(
          candidateEmail,
          candidateName,
          job.title,
          interviewTypeDisplay,
          dateStr,
          timeStr,
          rescheduleData.interviewMode || evaluation.interviewMode || 'offline',
          rescheduleData.platform || evaluation.platform,
          rescheduleData.meetingLink || evaluation.meetingLink,
          rescheduleData.reportingTime,
          companyName,
          rescheduleData.locationDetails || evaluation.locationDetails,
          company.contactEmail || 'hirehelp23@gmail.com',
          company.contactPhone
        );

        // Send email to INTERVIEWER if exists
        if (interviewer) {
          await this.emailService.sendInterviewerRescheduledEmail(
            interviewer.email,
            interviewer.name,
            candidateName,
            job.title,
            interviewTypeDisplay,
            dateStr,
            timeStr,
            rescheduleData.interviewMode || evaluation.interviewMode || 'offline',
            rescheduleData.platform || evaluation.platform,
            rescheduleData.meetingLink || evaluation.meetingLink,
            rescheduleData.reportingTime,
            companyName,
            rescheduleData.locationDetails || evaluation.locationDetails,
            company.contactEmail || 'hirehelp23@gmail.com'
          );
        }

        console.log(`✅ Reschedule emails sent to candidate and interviewer`);
      }
    } catch (emailError) {
      console.error('Failed to send reschedule emails:', emailError);
      // Non-blocking
    }

    return updatedEvaluation;
  }

  async createQuestionBankItem(companyId: string, dto: CreateQuestionBankItemDto): Promise<QuestionBankItem> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const created = new this.questionBankModel({
      ...dto,
      companyId: companyObjectId,
    });
    return created.save();
  }

  async listQuestionBank(companyId: string, filters?: { category?: string; difficulty?: string; search?: string }): Promise<QuestionBankItem[]> {
    const companyObjectId = this.getCompanyObjectIdOrNull(companyId);
    if (!companyObjectId) return [];
    const query: Record<string, any> = { companyId: companyObjectId };
    if (filters?.category) query.category = filters.category;
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.search) query.questionText = { $regex: filters.search, $options: 'i' };
    return this.questionBankModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async updateQuestionBankItem(companyId: string, id: string, dto: UpdateQuestionBankItemDto): Promise<QuestionBankItem> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const item = await this.questionBankModel.findOneAndUpdate(
      { _id: id, companyId: companyObjectId },
      dto,
      { new: true },
    ).exec();
    if (!item) throw new NotFoundException('Question not found');
    return item;
  }

  async deleteQuestionBankItem(companyId: string, id: string): Promise<{ deleted: boolean }> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const deleted = await this.questionBankModel.deleteOne({ _id: id, companyId: companyObjectId }).exec();
    return { deleted: deleted.deletedCount > 0 };
  }

  async createQuestionSet(companyId: string, dto: CreateQuestionSetDto): Promise<QuestionSet> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const questionIds = (dto.questionIds || []).map((id) => new Types.ObjectId(id));
    const created = new this.questionSetModel({
      ...dto,
      questionIds,
      companyId: companyObjectId,
    });
    return created.save();
  }

  async listQuestionSets(companyId: string): Promise<QuestionSet[]> {
    const companyObjectId = this.getCompanyObjectIdOrNull(companyId);
    if (!companyObjectId) return [];
    return this.questionSetModel.find({ companyId: companyObjectId }).sort({ createdAt: -1 }).exec();
  }

  async updateQuestionSet(companyId: string, id: string, dto: UpdateQuestionSetDto): Promise<QuestionSet> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const patch: any = { ...dto };
    if (dto.questionIds) {
      patch.questionIds = dto.questionIds.map((qid) => new Types.ObjectId(qid));
    }
    const updated = await this.questionSetModel.findOneAndUpdate(
      { _id: id, companyId: companyObjectId },
      patch,
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Question set not found');
    return updated;
  }

  async addQuestionsToSet(companyId: string, id: string, questionIds: string[]): Promise<QuestionSet> {
    const companyObjectId = this.getCompanyObjectId(companyId);
    const updated = await this.questionSetModel.findOneAndUpdate(
      { _id: id, companyId: companyObjectId },
      { $addToSet: { questionIds: { $each: questionIds.map((qid) => new Types.ObjectId(qid)) } } },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Question set not found');
    return updated;
  }

  async startExam(roundId: string, applicationId: string, candidateId: string): Promise<any> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) throw new NotFoundException('Round not found');
    if (round.type !== RoundType.MCQ || round.mode !== MCQMode.INTERNAL) {
      throw new BadRequestException('Round is not internal MCQ');
    }

    const application = await this.applicationsService.findOne(applicationId);
    const appCandidateId = (application.candidateId as any)._id?.toString?.() || application.candidateId.toString();
    if (appCandidateId !== candidateId) {
      throw new ForbiddenException('You are not allowed to start this exam');
    }

    const latestSession = await this.examSessionModel.findOne({
      roundId,
      applicationId,
      candidateId,
    }).sort({ createdAt: -1 }).exec();

    const latestStatus = String(latestSession?.status || '').toLowerCase();
    const hasSubmittedAlready =
      latestStatus === ExamSessionStatus.SUBMITTED || latestStatus === ExamSessionStatus.TIMEOUT_SUBMITTED;

    const existingSubmitted = hasSubmittedAlready ? latestSession : null;
    if (existingSubmitted) {
      throw new BadRequestException('Exam already submitted');
    }

    let session = latestStatus === ExamSessionStatus.IN_PROGRESS ? latestSession : null;

    const bankQuestions = await this.getQuestionSetQuestions(round);
    const inlineQuestions = (round.mcqQuestions || []).map((q, idx) => ({
      _id: new Types.ObjectId(`${idx + 1}`.padStart(24, '0')),
      questionText: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    })) as any[];
    const sourceQuestions = bankQuestions.length > 0 ? bankQuestions : inlineQuestions;
    if (!sourceQuestions.length) {
      throw new BadRequestException('No questions configured for this round');
    }

    if (!session) {
      const questionOrder = [...sourceQuestions].sort(() => Math.random() - 0.5).map((q: any) => q._id);
      const startTime = new Date();
      const durationMinutes = this.parseDurationMinutes(round);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      session = await new this.examSessionModel({
        candidateId: new Types.ObjectId(candidateId),
        applicationId: new Types.ObjectId(applicationId),
        roundId: new Types.ObjectId(roundId),
        startTime,
        endTime,
        questionOrder,
        answers: new Array(sourceQuestions.length).fill(-1),
      }).save();
      this.eventEmitter.emit(RoundEvents.ROUND_STARTED, {
        roundId,
        applicationId,
        candidateId,
      });
    }

    const questionMap = new Map(sourceQuestions.map((q: any) => [q._id.toString(), q]));
    const orderedQuestions = session.questionOrder
      .map((id) => questionMap.get(id.toString()))
      .filter(Boolean)
      .map((q: any, index) => ({
        questionIndex: index,
        id: q._id,
        questionText: q.questionText || q.question,
        options: q.options,
      }));

    return {
      sessionId: session._id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      answers: session.answers,
      questions: orderedQuestions,
      durationMinutes: this.parseDurationMinutes(round),
      autoSubmit: round.autoSubmit ?? true,
    };
  }

  async saveExamAnswer(roundId: string, applicationId: string, candidateId: string, questionIndex: number, answer: number): Promise<ExamSession> {
    let session = await this.findLatestExamSession(roundId, applicationId, candidateId);

    if (!session) {
      const existingSubmitted = await this.findLatestExamSession(roundId, applicationId, candidateId);
      if (existingSubmitted) return existingSubmitted;

      // Recover from lost client/session race by re-ensuring exam session.
      const startedSession = await this.startExam(roundId, applicationId, candidateId);
      session = await this.examSessionModel.findById(startedSession.sessionId).exec();
      if (!session) throw new NotFoundException('Active exam session not found');
    }

    const currentStatus = String(session.status || '').toLowerCase();
    if (currentStatus !== ExamSessionStatus.IN_PROGRESS) {
      return session;
    }
    if (new Date() > session.endTime) {
      return this.submitExam(roundId, applicationId, candidateId, true) as any;
    }
    if (questionIndex < 0 || questionIndex >= session.answers.length) {
      throw new BadRequestException('Invalid question index');
    }
    session.answers[questionIndex] = answer;
    return session.save();
  }

  async submitExam(roundId: string, applicationId: string, candidateId: string, timeoutSubmit = false): Promise<any> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) throw new NotFoundException('Round not found');

    let session = await this.findLatestExamSession(roundId, applicationId, candidateId);

    // Make submit idempotent: if already submitted, return existing result instead of 404.
    const currentStatus = String(session?.status || '').toLowerCase();
    if (!session || currentStatus !== ExamSessionStatus.IN_PROGRESS) {
      const existingSubmitted = await this.findLatestExamSession(roundId, applicationId, candidateId);

      const submittedStatus = String(existingSubmitted?.status || '').toLowerCase();
      if (
        existingSubmitted &&
        (submittedStatus === ExamSessionStatus.SUBMITTED || submittedStatus === ExamSessionStatus.TIMEOUT_SUBMITTED)
      ) {
        const passPercentage = round.passPercentage ?? 60;
        const score = existingSubmitted.score ?? 0;
        return {
          score,
          passed: score >= passPercentage,
          passPercentage,
          timeoutSubmit: existingSubmitted.status === ExamSessionStatus.TIMEOUT_SUBMITTED,
          alreadySubmitted: true,
        };
      }

      // Recover session if missing due client refresh/race; then continue submit.
      const startedSession = await this.startExam(roundId, applicationId, candidateId);
      session = await this.examSessionModel.findById(startedSession.sessionId).exec();
      if (!session) throw new NotFoundException('No active exam session');

      const restartedStatus = String(session.status || '').toLowerCase();
      if (restartedStatus !== ExamSessionStatus.IN_PROGRESS) {
        const passPercentage = round.passPercentage ?? 60;
        const score = session.score ?? 0;
        return {
          score,
          passed: score >= passPercentage,
          passPercentage,
          timeoutSubmit: restartedStatus === ExamSessionStatus.TIMEOUT_SUBMITTED,
          alreadySubmitted: true,
        };
      }
    }

    const orderedQuestionIds = (session.questionOrder || []).map((qid) => qid.toString());
    const validOrderedObjectIds = orderedQuestionIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    // Score against the exact question ids delivered in this session.
    const bankQuestionsInSession = validOrderedObjectIds.length
      ? await this.questionBankModel
        .find({ _id: { $in: validOrderedObjectIds } })
        .select('_id correctAnswer')
        .exec()
      : [];
    const bankQuestionMap = new Map(bankQuestionsInSession.map((q: any) => [q._id.toString(), q]));

    // Inline fallback for rounds not backed by question bank.
    const inlineQuestions = (round.mcqQuestions || []).map((q, idx) => ({
      _id: new Types.ObjectId(`${idx + 1}`.padStart(24, '0')),
      correctAnswer: q.correctAnswer,
    })) as any[];
    const inlineQuestionMap = new Map(inlineQuestions.map((q: any) => [q._id.toString(), q]));

    let correctCount = 0;
    const isCorrect: boolean[] = [];
    session.questionOrder.forEach((qid, idx) => {
      const qidStr = qid.toString();
      const q = bankQuestionMap.get(qidStr) || inlineQuestionMap.get(qidStr);
      const selectedAnswer = session.answers[idx];
      const hasValidAnswer = selectedAnswer !== undefined && selectedAnswer !== null && selectedAnswer >= 0;
      const correct = !!q && hasValidAnswer && selectedAnswer === q.correctAnswer;
      isCorrect.push(correct);
      if (correct) correctCount++;
    });
    const totalQuestions = session.questionOrder?.length || session.answers?.length || 0;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    session.status = timeoutSubmit ? ExamSessionStatus.TIMEOUT_SUBMITTED : ExamSessionStatus.SUBMITTED;
    session.score = score;
    session.submittedAt = new Date();
    await session.save();

    await this.mcqResponseModel.findOneAndUpdate(
      { roundId, applicationId, candidateId },
      {
        roundId: new Types.ObjectId(roundId),
        applicationId: new Types.ObjectId(applicationId),
        candidateId: new Types.ObjectId(candidateId),
        answers: session.answers,
        isCorrect,
        score,
        isSubmitted: true,
        submittedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    const passPercentage = round.passPercentage ?? 60;
    const passed = score >= passPercentage;

    const evaluation = await this.roundEvaluationModel.findOne({ roundId, applicationId }).exec();
    if (evaluation) {
      evaluation.status = passed ? EvaluationStatus.PASSED : EvaluationStatus.FAILED;
      evaluation.score = score;
      evaluation.completedAt = new Date();
      await evaluation.save();
      if (passed) {
        await this.assignToNextRound(applicationId, roundId);
      }
    }

    this.eventEmitter.emit(RoundEvents.ROUND_SUBMITTED, { roundId, applicationId, candidateId, score });
    this.eventEmitter.emit(passed ? RoundEvents.ROUND_PASSED : RoundEvents.ROUND_FAILED, {
      roundId,
      applicationId,
      candidateId,
      score,
    });

    return { score, passed, passPercentage, timeoutSubmit };
  }

  async getExamSession(roundId: string, applicationId: string, candidateId: string): Promise<ExamSession | null> {
    return this.findLatestExamSession(roundId, applicationId, candidateId);
  }

  async getRoundQuestions(roundId: string): Promise<any[]> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) throw new NotFoundException('Round not found');

    if (round.questionSetId) {
      const set = await this.questionSetModel.findById(round.questionSetId).exec();
      if (!set || !set.questionIds?.length) return [];
      return this.questionBankModel.find({ _id: { $in: set.questionIds } }).exec();
    }

    if (round.mcqQuestions && round.mcqQuestions.length > 0) {
      return round.mcqQuestions.map((q, idx) => ({
        _id: new Types.ObjectId(`${idx + 1}`.padStart(24, '0')),
        questionText: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));
    }

    return [];
  }

  async syncExternalRound(roundId: string, googleSheetUrl: string): Promise<{ synced: number }> {
    const round = await this.roundModel.findById(roundId).exec();
    if (!round) throw new NotFoundException('Round not found');
    const rows = await this.fetchGoogleSheetData(googleSheetUrl);
    let synced = 0;
    for (const row of rows) {
      const email = row.Email || row.email || row['Email Address'];
      if (!email) continue;
      const user = await this.usersService.findByEmail(email);
      if (!user) continue;
      const userId = (user as any)._id?.toString?.();
      if (!userId) continue;
      const application = await this.applicationsService.findByCandidate(userId);
      const match = application.find((app) => {
        const appJobId = (app.jobId as any)?._id?.toString?.() || app.jobId.toString();
        return appJobId === round.jobId.toString();
      });
      if (!match) continue;
      const scoreRaw = row.Score || row.score || row.Marks || row.marks;
      const parsedScore = Number(scoreRaw);
      const score = Number.isFinite(parsedScore) ? parsedScore : 0;
      const passPercentage = round.passPercentage ?? 60;
      const passed = score >= passPercentage;
      await this.roundEvaluationModel.findOneAndUpdate(
        { roundId: round._id, applicationId: (match as any)._id },
        {
          status: passed ? EvaluationStatus.PASSED : EvaluationStatus.FAILED,
          score,
          completedAt: new Date(),
        },
        { new: true },
      ).exec();
      this.eventEmitter.emit(RoundEvents.ROUND_SUBMITTED, { roundId, applicationId: (match as any)._id.toString(), candidateId: userId, score });
      this.eventEmitter.emit(passed ? RoundEvents.ROUND_PASSED : RoundEvents.ROUND_FAILED, { roundId, applicationId: (match as any)._id.toString(), candidateId: userId, score });
      synced++;
    }
    return { synced };
  }

  async getCompanyMcqAnalytics(companyId: string): Promise<{
    totalSessions: number;
    submittedSessions: number;
    completionRate: number;
    averageScore: number;
    timeoutCount: number;
  }> {
    const jobs = await this.jobsService.findByCompany(companyId);
    const rounds = await this.roundModel.find({
      jobId: { $in: jobs.map((job: any) => job._id) },
      type: RoundType.MCQ,
    }).select('_id').exec();
    const roundIds = rounds.map((r) => r._id);
    if (!roundIds.length) {
      return { totalSessions: 0, submittedSessions: 0, completionRate: 0, averageScore: 0, timeoutCount: 0 };
    }
    const sessions = await this.examSessionModel.find({ roundId: { $in: roundIds } }).exec();
    const totalSessions = sessions.length;
    const submitted = sessions.filter((s) => s.status !== ExamSessionStatus.IN_PROGRESS);
    const submittedSessions = submitted.length;
    const averageScore = submittedSessions
      ? submitted.reduce((sum, s) => sum + (s.score || 0), 0) / submittedSessions
      : 0;
    const timeoutCount = sessions.filter((s) => s.status === ExamSessionStatus.TIMEOUT_SUBMITTED).length;
    const completionRate = totalSessions ? (submittedSessions / totalSessions) * 100 : 0;
    return { totalSessions, submittedSessions, completionRate, averageScore, timeoutCount };
  }
}

