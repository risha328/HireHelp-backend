import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

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
  @ApiOperation({ summary: 'Get all jobs (paginated when page/limit provided)' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobType') jobType?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
  ) {
    const hasPagination = page !== undefined || limit !== undefined;
    if (hasPagination) {
      const pageNum = Math.max(1, parseInt(page || '', 10) || DEFAULT_PAGE);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit || '', 10) || DEFAULT_LIMIT));
      return this.jobsService.findAllPaginated({
        page: pageNum,
        limit: limitNum,
        jobType: jobType || undefined,
        search: search || undefined,
        location: location || undefined,
      });
    }
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
