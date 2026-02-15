import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from './job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly companiesService: CompaniesService,
  ) { }

  async create(createJobDto: CreateJobDto): Promise<Job> {
    try {
      // Validate that company exists and is verified
      const company = await this.companiesService.findOne(createJobDto.companyId);

      if (!company) {
        throw new NotFoundException(`Company with ID ${createJobDto.companyId} not found`);
      }

      if (company.verificationStatus !== 'verified') {
        throw new BadRequestException(
          `Company must be verified before posting jobs. Current status: ${company.verificationStatus}`,
        );
      }

      const createdJob = new this.jobModel(createJobDto);
      return await createdJob.save();
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  async findAll(): Promise<Job[]> {
    return this.jobModel
      .find({
        status: 'active',
        $or: [
          { scheduledPublishAt: { $lte: new Date() } },
          { scheduledPublishAt: { $exists: false } },
        ],
      })
      .populate('companyId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCompany(companyId: string): Promise<Job[]> {
    return this.jobModel.find({ companyId, status: 'active' }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Job | null> {
    return this.jobModel.findById(id).populate('companyId').exec();
  }

  async update(id: string, updateData: any): Promise<Job | null> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Restriction: Cannot edit if already published
    if (job.status === 'active' && job.scheduledPublishAt <= new Date()) {
      throw new ForbiddenException('Published jobs cannot be edited to maintain consistency for applicants');
    }

    return this.jobModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async remove(id: string): Promise<Job | null> {
    return this.jobModel.findByIdAndDelete(id).exec();
  }
}
