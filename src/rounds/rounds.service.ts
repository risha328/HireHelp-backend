import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Round, RoundDocument } from './round.schema';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class RoundsService {
  constructor(
    @InjectModel(Round.name) private roundModel: Model<RoundDocument>,
    private readonly jobsService: JobsService,
  ) {}

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
}
