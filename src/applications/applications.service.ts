import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './application.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { EmailService } from '../notifications/email.service';
import { RoundsService } from '../rounds/rounds.service';
import { RoundType, RoundDocument } from '../rounds/round.schema';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private emailService: EmailService,
    @Inject(forwardRef(() => RoundsService))
    private roundsService: RoundsService,
  ) { }

  async create(
    createApplicationDto: CreateApplicationDto,
    candidateId: string,
    files?: { resume?: Express.Multer.File[], coverLetterFile?: Express.Multer.File[] }
  ): Promise<Application> {
    let resumeUrl: string | undefined;
    let coverLetterUrl: string | undefined;

    // Handle file uploads
    if (files?.resume && files.resume[0]) {
      const resumeFile = files.resume[0];
      const timestamp = Date.now();
      const filename = `${candidateId}-${timestamp}-${resumeFile.originalname}`;
      const fs = require('fs');
      const path = require('path');

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, resumeFile.buffer);
      resumeUrl = `/uploads/resumes/${filename}`;
    }

    if (files?.coverLetterFile && files.coverLetterFile[0]) {
      const coverLetterFile = files.coverLetterFile[0];
      const timestamp = Date.now();
      const filename = `${candidateId}-${timestamp}-${coverLetterFile.originalname}`;
      const fs = require('fs');
      const path = require('path');

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes'); // Using same directory for simplicity
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, coverLetterFile.buffer);
      coverLetterUrl = `/uploads/resumes/${filename}`;
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

  async findByCompany(companyId: string): Promise<Application[]> {
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
    return applications;
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

  async findOne(id: string): Promise<Application> {
    const application = await this.applicationModel
      .findById(id)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
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
    // Check for Round Change (e.g. to Coding Test)
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
            instructions: newRoundObj.instructions
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
            console.log('✓ Email sent successfully!');
          } else {
            console.log('✗ Round type is NOT CODING:', newRoundObj.type);
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
    } else if (currentApplication.status === ApplicationStatus.SHORTLISTED && status === ApplicationStatus.HIRED) {
      try {
        await this.emailService.sendHireEmail(
          (application.candidateId as any).email,
          (application.candidateId as any).name,
          (application.jobId as any).title,
          (application.companyId as any).name,
        );
      } catch (error) {
        console.error('Failed to send hire email:', error);
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
        } else if (currentApplication.status === ApplicationStatus.UNDER_REVIEW) {
          await this.emailService.sendRejectionFromUnderReviewEmail(
            (application.candidateId as any).email,
            (application.candidateId as any).name,
            (application.jobId as any).title,
            (application.companyId as any).name,
          );
        } else if (currentApplication.status === ApplicationStatus.SHORTLISTED) {
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
}
