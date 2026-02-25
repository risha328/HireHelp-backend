import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './application.schema';
import { OnboardingService } from './onboarding.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { EmailService } from '../notifications/email.service';
import { RoundsService } from '../rounds/rounds.service';
import { RoundType, RoundDocument } from '../rounds/round.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private emailService: EmailService,
    @Inject(forwardRef(() => RoundsService))
    private roundsService: RoundsService,
    private cloudinaryService: CloudinaryService,
    private onboardingService: OnboardingService,
  ) { }

  async create(
    createApplicationDto: CreateApplicationDto,
    candidateId: string,
    files?: { resume?: Express.Multer.File[], coverLetterFile?: Express.Multer.File[] }
  ): Promise<Application> {
    let resumeUrl: string | undefined;
    let coverLetterUrl: string | undefined;

    if (files?.resume && files.resume[0]) {
      const file = files.resume[0];
      const { secure_url } = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'hirehelp/resumes',
        { resource_type: 'raw', originalFilename: file.originalname },
      );
      resumeUrl = secure_url;
    }

    if (files?.coverLetterFile && files.coverLetterFile[0]) {
      const file = files.coverLetterFile[0];
      const { secure_url } = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'hirehelp/cover-letters',
        { resource_type: 'raw', originalFilename: file.originalname },
      );
      coverLetterUrl = secure_url;
    }

    const application = new this.applicationModel({
      ...createApplicationDto,
      candidateId,
      resumeUrl: resumeUrl || createApplicationDto.resumeUrl,
      coverLetter: createApplicationDto.coverLetter || coverLetterUrl,
    });
    await application.save();
    await application.populate(['candidateId', 'jobId', 'companyId']);

    try {
      await this.emailService.sendApplicationConfirmationEmail(
        (application.candidateId as any).email,
        (application.candidateId as any).name,
        (application.jobId as any).title,
        (application.companyId as any).name,
      );
    } catch (error) {
      console.error('Failed to send application confirmation email:', error);
      // Don't throw error to avoid breaking application creation
    }

    return application;
  }

  async findByCompany(companyId: string): Promise<(Application & { onboardingPhase?: string })[]> {
    console.log('findByCompany called with companyId:', companyId);
    const applications = await this.applicationModel
      .find({ companyId })
      .populate('candidateId', 'name email phone')
      .populate({
        path: 'jobId',
        select: 'title companyId location salary jobType',
        populate: {
          path: 'companyId',
          select: 'name logoUrl'
        }
      })
      .populate('companyId', 'name')
      .exec();
    console.log('findByCompany found applications:', applications.length);
    return applications.map((app) => {
      const obj = app.toObject ? app.toObject() : app;
      return { ...obj, onboardingPhase: this.onboardingService.getOnboardingPhase(app) };
    });
  }

  async findByCandidate(candidateId: string): Promise<Application[]> {
    return this.applicationModel
      .find({ candidateId })
      .populate({
        path: 'jobId',
        select: 'title companyId location salary jobType',
        populate: {
          path: 'companyId',
          select: 'name logoUrl'
        }
      })
      .populate('companyId', 'name')
      .exec();
  }

  async findByCandidateEmail(email: string): Promise<Application | null> {
    const application = await this.applicationModel
      .findOne({ 'candidateId.email': email })
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    return application;
  }

  async findOne(id: string): Promise<Application & { onboardingPhase?: string }> {
    const application = await this.applicationModel
      .findById(id)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const obj = application.toObject ? application.toObject() : application;
    return { ...obj, onboardingPhase: this.onboardingService.getOnboardingPhase(application) } as Application & { onboardingPhase?: string };
  }

  async findAll(): Promise<Application[]> {
    return this.applicationModel
      .find({})
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: string, notes?: string, currentRound?: string): Promise<Application> {
    // Get the current application to check previous status
    const currentApplication = await this.applicationModel.findById(id).populate('currentRound').exec();
    if (!currentApplication) {
      throw new NotFoundException('Application not found');
    }

    const updateData: any = { status, notes };
    if (currentRound !== undefined) {
      updateData.currentRound = currentRound;
    }

    const application = await this.applicationModel
      .findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .populate('currentRound')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Send email notifications based on status changes
    // Check for Round Change (e.g. to Coding Test or Interview)
    console.log('=== Email Notification Debug ===');
    console.log('currentRound param:', currentRound);
    console.log('currentApplication.currentRound:', currentApplication.currentRound);

    if (currentRound && (!currentApplication.currentRound || (currentApplication.currentRound as any)._id?.toString() !== currentRound)) {
      console.log('✓ Round change detected!');
      try {
        const newRoundObj = await this.roundsService.findOne(currentRound);

        if (newRoundObj) {
          console.log('New round object:', {
            id: (newRoundObj as any)._id,
            name: newRoundObj.name,
            type: newRoundObj.type,
            platform: newRoundObj.platform,
            duration: newRoundObj.duration,
            instructions: newRoundObj.instructions,
            scheduledAt: newRoundObj.scheduledAt,
            interviewMode: newRoundObj.interviewMode
          });

          if (newRoundObj.type === RoundType.CODING) {
            console.log('✓ Round type is CODING - sending email...');
            console.log('Email details:', {
              to: (application.candidateId as any).email,
              candidateName: (application.candidateId as any).name,
              jobTitle: (application.jobId as any).title,
              companyName: (application.companyId as any).name,
              platform: newRoundObj.platform || '',
              duration: newRoundObj.duration || '',
              instructions: newRoundObj.instructions || ''
            });

            await this.emailService.sendCodingTestEmail(
              (application.candidateId as any).email,
              (application.candidateId as any).name,
              (application.jobId as any).title,
              (application.companyId as any).name,
              newRoundObj.platform || '',
              newRoundObj.duration || '',
              newRoundObj.instructions || ''
            );
            console.log('✓ Coding test email sent successfully!');
          } else if (newRoundObj.type === RoundType.INTERVIEW || newRoundObj.type === RoundType.TECHNICAL || newRoundObj.type === RoundType.HR) {
            // Do not email candidate when just moving to interview round. Emails are sent only when interview is scheduled (assignInterviewer in rounds.service).
            console.log('✓ Round type is interview (INTERVIEW/TECHNICAL/HR) - skipping early notification; candidate will be notified when interview is scheduled.');
          } else {
            console.log('✗ Round type is neither CODING nor INTERVIEW:', newRoundObj.type);
          }
        } else {
          console.log('✗ Round not found for ID:', currentRound);
        }
      } catch (error) {
        console.error('✗ Failed to send round change email:', error);
      }
    } else {
      console.log('✗ No round change detected or currentRound is undefined');
    }
    console.log('=== End Email Debug ===');


    if (status === ApplicationStatus.UNDER_REVIEW) {
      try {
        // Only send initial MCQ email if moving from APPLIED or if no checking Round Change
        // But to be safe and avoid regression, I'll leave it but maybe guard it? 
        // For now, assume this logic is for the FIRST round.

        // Find the first MCQ round for this job
        const mcqRounds = await this.roundsService.findByJob((application.jobId as any)._id.toString());
        const firstMcqRound = mcqRounds.find(round => round.type === RoundType.MCQ && round.googleFormLink) as RoundDocument | undefined;

        // Only send if we are NOT in a specific round or if it matches first round? 
        // Existing logic is a bit loose. I'll leave it as is to avoid breaking "Approved to MCQ" flow.

        if (firstMcqRound && firstMcqRound.googleFormLink && (!currentRound || currentRound === (firstMcqRound as any)._id.toString())) {
          // Added check: Only if currentRound matches firstMcqRound OR is undefined
          // This prevents sending MCQ email when moving to Coding Test (Round 2)
          await this.emailService.sendMcqRoundEmail(
            (application.candidateId as any).email,
            (application.candidateId as any).name,
            (application.jobId as any).title,
            (application.companyId as any).name,
            firstMcqRound.googleFormLink,
            firstMcqRound.name,
          );
        }
      } catch (error) {
        console.error('Failed to send MCQ round email:', error);
        // Don't throw error to avoid breaking the status update
      }
    } else if (currentApplication.status === ApplicationStatus.UNDER_REVIEW && status === ApplicationStatus.SHORTLISTED) {
      try {
        await this.emailService.sendShortlistEmail(
          (application.candidateId as any).email,
          (application.candidateId as any).name,
          (application.jobId as any).title,
          (application.companyId as any).name,
        );
      } catch (error) {
        console.error('Failed to send shortlist email:', error);
        // Don't throw error to avoid breaking the status update
      }
    } else if (status === ApplicationStatus.HIRED) {
      // Do not send generic hire email here; offer letter email is sent when company clicks "Send Offer"
      // (via OfferLetterService.sendOffer). That is the single touchpoint for the candidate.
    } else if (status === ApplicationStatus.HOLD) {
      try {
        await this.emailService.sendHoldEmail(
          (application.candidateId as any).email,
          (application.candidateId as any).name,
          (application.jobId as any).title,
          (application.companyId as any).name,
        );
      } catch (error) {
        console.error('Failed to send hold email:', error);
        // Don't throw error to avoid breaking the status update
      }
    } else if (status === ApplicationStatus.REJECTED) {
      try {
        const previousRound = currentApplication.currentRound as any;
        // If rejected from an MCQ round (or implies MCQ failure)
        if (previousRound && previousRound.type === RoundType.MCQ) {
          await this.emailService.sendMcqRejectionEmail(
            (application.candidateId as any).email,
            (application.candidateId as any).name,
            (application.jobId as any).title,
            (application.companyId as any).name,
          );
        } else if (currentApplication.status === ApplicationStatus.APPLIED ||
          currentApplication.status === ApplicationStatus.UNDER_REVIEW) {
          await this.emailService.sendRejectionFromUnderReviewEmail(
            (application.candidateId as any).email,
            (application.candidateId as any).name,
            (application.jobId as any).title,
            (application.companyId as any).name,
          );
        } else if (currentApplication.status === ApplicationStatus.SHORTLISTED ||
          currentApplication.status === ApplicationStatus.HOLD) {
          await this.emailService.sendRejectionFromShortlistedEmail(
            (application.candidateId as any).email,
            (application.candidateId as any).name,
            (application.jobId as any).title,
            (application.companyId as any).name,
          );
        }
      } catch (error) {
        console.error('Failed to send rejection email:', error);
        // Don't throw error to avoid breaking the status update
      }
    }

    return application;
  }

  /** Convert accepted hire to employee: send welcome email and unlock document upload. Company admin only. */
  async convertToEmployee(applicationId: string, companyId: string): Promise<Application> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .populate('companyId', 'name contactEmail contactPhone hrContactName hrDesignation')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCompanyId = (application.companyId as any)?._id?.toString?.() ?? (application.companyId as any)?.toString?.();
    if (appCompanyId !== companyId) {
      throw new ForbiddenException('Application does not belong to your company');
    }
    if (application.status !== ApplicationStatus.HIRED) {
      throw new BadRequestException('Application must be in HIRED status');
    }
    if (application.offerAccepted !== true) {
      throw new BadRequestException('Candidate must have accepted the offer');
    }
    if ((application as any).convertedToEmployee === true) {
      return application;
    }
    const joiningDate = (application as any).joiningDate
      ? new Date((application as any).joiningDate)
      : (application.offerDetails?.startDate ? new Date(application.offerDetails.startDate) : null);
    if (!joiningDate || isNaN(joiningDate.getTime())) {
      throw new BadRequestException('Joining date is not set. Set it in the offer or application.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const joinDay = new Date(joiningDate);
    joinDay.setHours(0, 0, 0, 0);
    if (joinDay > today) {
      throw new BadRequestException('Convert to employee is only available on or after the joining date.');
    }
    const candidateEmail = (application.candidateId as any)?.email;
    if (!candidateEmail) {
      throw new BadRequestException('Candidate email not found');
    }
    const candidateName = (application.candidateId as any)?.name || 'Candidate';
    const jobTitle = (application.jobId as any)?.title || application.offerDetails?.jobTitle || 'the position';
    const companyName = (application.companyId as any)?.name || 'Company';
    const company = application.companyId as any;
    const hrEmail = company?.contactEmail || process.env.SMTP_USER || '';
    const joiningDateFormatted = joiningDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const companyContactInfo = [company?.contactPhone, company?.contactEmail].filter(Boolean).join(', ') || companyName;
    try {
      await this.emailService.sendWelcomeOnboardingEmail(
        candidateEmail,
        candidateName,
        jobTitle,
        companyName,
        joiningDateFormatted,
        hrEmail,
        company?.hrContactName,
        company?.hrDesignation,
        companyContactInfo,
      );
    } catch (err) {
      console.error('Convert to employee: welcome email failed', err);
      throw err;
    }
    (application as any).convertedToEmployee = true;
    await application.save();
    await this.onboardingService.recomputeOnboardingProgress(applicationId);
    const updated = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    const obj = updated?.toObject ? updated.toObject() : updated;
    return { ...obj, onboardingPhase: this.onboardingService.getOnboardingPhase(updated!) } as unknown as Application;
  }
}
