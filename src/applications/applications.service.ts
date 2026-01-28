import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from './application.schema';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, candidateId: string): Promise<Application> {
    const application = new this.applicationModel({
      ...createApplicationDto,
      candidateId,
    });
    return application.save();
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
    return application;
  }
}
