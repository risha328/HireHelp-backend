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

    return savedEvaluation.populate(['roundId', 'applicationId', 'evaluatorId']);
  }

  async updateEvaluationStatus(evaluationId: string, status: EvaluationStatus, notes?: string): Promise<RoundEvaluationDocument> {
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
          // Missing evaluation detected! Create it.
          try {
            console.log(`Self-healing: Creating missing evaluation for App ${(app as any)._id}, Round ${roundId}`);
            const companyId = (app.companyId as any)._id || app.companyId;

            // Use assignCandidateToRound to create the record
            const newEvaluation = await this.assignCandidateToRound(
              roundId,
              (app as any)._id.toString(),
              companyId.toString()
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

  async rescheduleRound(evaluationId: string): Promise<RoundEvaluationDocument> {
    const evaluation = await this.roundEvaluationModel.findById(evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${evaluationId} not found`);
    }

    if (evaluation.status === EvaluationStatus.MISSED) {
      evaluation.status = EvaluationStatus.RESCHEDULING;
      await evaluation.save();
    }

    return evaluation;
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

        // Determine interview type display name
        let interviewTypeDisplay = 'Interview';
        if (round.type) {
          if (round.type.toString().toLowerCase() === 'hr') {
            interviewTypeDisplay = 'HR Interview';
          } else if (round.type.toString().toLowerCase() === 'technical') {
            interviewTypeDisplay = 'Technical Interview';
          } else {
            interviewTypeDisplay = round.type.charAt(0).toUpperCase() + round.type.slice(1).replace(/_/g, ' ') + ' Interview';
          }
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
}

