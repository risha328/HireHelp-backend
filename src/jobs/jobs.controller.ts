import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new job (company must be verified)' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Company must be verified before posting jobs' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  findAll() {
    return this.jobsService.findAll();
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get jobs by company ID' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.jobsService.findByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.jobsService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }
}
