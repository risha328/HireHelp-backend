import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Round, RoundDocument, RoundType } from './round.schema';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { JobsService } from '../jobs/jobs.service';
import { RoundEvaluation, RoundEvaluationDocument, EvaluationStatus } from './round-evaluation.schema';
import { MCQResponse, MCQResponseDocument } from './mcq-response.schema';
import { ApplicationsService } from '../applications/applications.service';
import { EmailService } from '../notifications/email.service';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleFormsService } from './google-forms.service';
import { SubmitMcqDto } from './dto/submit-mcq.dto';

@Injectable()
export class RoundsService {
  constructor(
    @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
    @InjectModel(RoundEvaluation.name) private roundEvaluationModel: Model<RoundEvaluationDocument>,
    @InjectModel(MCQResponse.name) private mcqResponseModel: Model<MCQResponseDocument>,
    private readonly jobsService: JobsService,
    @Inject(forwardRef(() => ApplicationsService))
    private readonly applicationsService: ApplicationsService,
    private readonly emailService: EmailService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleFormsService: GoogleFormsService,
  ) { }

  async create(createRoundDto: CreateRoundDto): Promise<Round> {
    try {
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
      return await createdRound.save();
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
    return this.roundModel.findById(id).populate('jobId').exec();
  }

  async update(id: string, updateRoundDto: UpdateRoundDto): Promise<Round | null> {
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

  async assignCandidateToRound(roundId: string, applicationId: string, evaluatorId: string): Promise<RoundEvaluation> {
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
    });

    const savedEvaluation = await roundEvaluation.save();

    // If it's an MCQ round, send the Google Form link email
    if (round.type === RoundType.MCQ && round.googleFormLink) {
      try {
        await this.emailService.sendMcqRoundEmail(
          (application.candidateId as any).email,
          (application.candidateId as any).name,
          (application.jobId as any).title,
          (application.companyId as any).name,
          round.googleFormLink,
          round.name,
        );
      } catch (error) {
        console.error('Failed to send MCQ round email:', error);
      }
    }

    return savedEvaluation.populate(['roundId', 'applicationId', 'evaluatorId']);
  }

  async updateEvaluationStatus(evaluationId: string, status: EvaluationStatus, notes?: string): Promise<RoundEvaluation> {
    const evaluation = await this.roundEvaluationModel.findById(evaluationId).exec();
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${evaluationId} not found`);
    }

    evaluation.status = status;
    evaluation.notes = notes;

    if (status === EvaluationStatus.COMPLETED || status === EvaluationStatus.PASSED || status === EvaluationStatus.FAILED) {
      evaluation.completedAt = new Date();
    }

    const updatedEvaluation = await evaluation.save();

    // If passed, assign to next round
    if (status === EvaluationStatus.PASSED) {
      await this.assignToNextRound(evaluation.applicationId.toString(), evaluation.roundId.toString());
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
        isActive: true,
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
    return this.mcqResponseModel
      .find({ roundId })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'name email' },
          { path: 'jobId', select: 'title' },
        ],
      })
      .exec();
  }

  async getMcqStatus(applicationId: string): Promise<{ submitted: boolean; score?: number }> {
    const response = await this.mcqResponseModel.findOne({ applicationId }).exec();
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

  async getAllMcqResponses(): Promise<any[]> {
    // Get all MCQ rounds with Google Form links
    const mcqRounds = await this.roundModel
      .find({ type: RoundType.MCQ, googleFormLink: { $exists: true, $ne: null } })
      .populate('jobId')
      .exec();

    const allResponses: any[] = [];

    // Get database responses
    const dbResponses = await this.mcqResponseModel
      .find({})
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

    return allResponses;
  }
}
