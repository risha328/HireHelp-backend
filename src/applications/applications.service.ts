import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './application.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private emailService: EmailService,
  ) {}

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

  async updateStatus(id: string, status: string, notes?: string): Promise<Application> {
    // Get the current application to check previous status
    const currentApplication = await this.applicationModel.findById(id).exec();
    if (!currentApplication) {
      throw new NotFoundException('Application not found');
    }

    const application = await this.applicationModel
      .findByIdAndUpdate(
        id,
        { status, notes },
        { new: true }
      )
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Send email notifications based on status changes
    if (currentApplication.status === ApplicationStatus.UNDER_REVIEW && status === ApplicationStatus.SHORTLISTED) {
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
        if (currentApplication.status === ApplicationStatus.UNDER_REVIEW) {
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
