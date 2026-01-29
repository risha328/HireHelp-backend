import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './application.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private emailService: EmailService,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, candidateId: string): Promise<Application> {
    const application = new this.applicationModel({
      ...createApplicationDto,
      candidateId,
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
    return this.applicationModel
      .find({ companyId })
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .exec();
  }

  async findByCandidate(candidateId: string): Promise<Application[]> {
    return this.applicationModel
      .find({ candidateId })
      .populate('jobId', 'title companyId')
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

    // Send email notification only if status changed from UNDER_REVIEW to SHORTLISTED
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
    }

    return application;
  }
}
