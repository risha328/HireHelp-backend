import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { SubmitMcqDto } from './dto/submit-mcq.dto';
import { FetchGoogleSheetDto } from './dto/fetch-google-sheet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluationStatus } from './round-evaluation.schema';

@ApiTags('rounds')
@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) { }

  @Patch('evaluations/:id/assign')
  @ApiOperation({ summary: 'Assign an interviewer to an evaluation and schedule' })
  @ApiResponse({ status: 200, description: 'Interviewer assigned and scheduled successfully' })
  async assignInterviewer(
    @Param('id') id: string,
    @Body() body: {
      interviewerId: string;
      interviewerName: string;
      interviewerEmail: string;
      scheduledAt: string;
      interviewMode: string;
      interviewType: string;
      platform?: string;
      meetingLink?: string;
      duration?: string;
      locationDetails?: any;
    }
  ) {
    return this.roundsService.assignInterviewer(id, body);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new round' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  create(@Body() createRoundDto: CreateRoundDto) {
    return this.roundsService.create(createRoundDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rounds' })
  @ApiResponse({ status: 200, description: 'Rounds retrieved successfully' })
  findAll() {
    return this.roundsService.findAll();
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get rounds by job ID' })
  @ApiResponse({ status: 200, description: 'Rounds retrieved successfully' })
  findByJob(@Param('jobId') jobId: string) {
    return this.roundsService.findByJob(jobId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a round by ID' })
  @ApiResponse({ status: 200, description: 'Round retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.roundsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a round' })
  @ApiResponse({ status: 200, description: 'Round updated successfully' })
  update(@Param('id') id: string, @Body() updateRoundDto: UpdateRoundDto) {
    return this.roundsService.update(id, updateRoundDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a round' })
  @ApiResponse({ status: 200, description: 'Round deleted successfully' })
  remove(@Param('id') id: string) {
    return this.roundsService.remove(id);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Archive a round' })
  @ApiResponse({ status: 200, description: 'Round archived successfully' })
  archive(@Param('id') id: string) {
    return this.roundsService.archive(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Activate a round' })
  @ApiResponse({ status: 200, description: 'Round activated successfully' })
  activate(@Param('id') id: string) {
    return this.roundsService.activate(id);
  }

  @Post(':roundId/assign/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign candidate to a round' })
  @ApiResponse({ status: 201, description: 'Candidate assigned to round successfully' })
  assignCandidateToRound(
    @Param('roundId') roundId: string,
    @Param('applicationId') applicationId: string,
    @Body('evaluatorId') evaluatorId: string,
  ) {
    return this.roundsService.assignCandidateToRound(roundId, applicationId, evaluatorId);
  }

  @Patch('evaluation/:evaluationId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update evaluation status' })
  @ApiResponse({ status: 200, description: 'Evaluation status updated successfully' })
  updateEvaluationStatus(
    @Param('evaluationId') evaluationId: string,
    @Body() body: { status: EvaluationStatus; notes?: string; feedback?: string; score?: number; recommendation?: 'hire' | 'hold' | 'reject' },
  ) {
    return this.roundsService.updateEvaluationStatus(evaluationId, body.status, body.notes, body.feedback, body.score, body.recommendation);
  }

  @Get(':roundId/evaluations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get round evaluations' })
  @ApiResponse({ status: 200, description: 'Round evaluations retrieved successfully' })
  getRoundEvaluations(@Param('roundId') roundId: string) {
    return this.roundsService.getRoundEvaluations(roundId);
  }

  @Post(':roundId/mcq/submit')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit MCQ responses for a round' })
  @ApiResponse({ status: 201, description: 'MCQ responses submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid submission data' })
  submitMcqResponse(
    @Param('roundId') roundId: string,
    @Body() submitMcqDto: SubmitMcqDto,
  ) {
    return this.roundsService.submitMcqResponse(roundId, submitMcqDto.applicationId, submitMcqDto);
  }

  @Get(':roundId/mcq/responses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get MCQ responses for a round (Admin only)' })
  @ApiResponse({ status: 200, description: 'MCQ responses retrieved successfully' })
  getMcqResponses(@Param('roundId') roundId: string) {
    return this.roundsService.getMcqResponses(roundId);
  }

  @Get('application/:applicationId/mcq/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get MCQ submission status for an application' })
  @ApiResponse({ status: 200, description: 'MCQ status retrieved successfully' })
  getMcqStatus(@Param('applicationId') applicationId: string) {
    return this.roundsService.getMcqStatus(applicationId);
  }

  @Get('mcq/responses/all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all MCQ responses for the company admin' })
  @ApiResponse({ status: 200, description: 'MCQ responses retrieved successfully' })
  getAllMcqResponses() {
    return this.roundsService.getAllMcqResponses();
  }

  @Post('fetch-google-sheet')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch data from a Google Sheets URL' })
  @ApiResponse({ status: 200, description: 'Google Sheets data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Google Sheets URL' })
  fetchGoogleSheet(@Body() fetchGoogleSheetDto: FetchGoogleSheetDto) {
    return this.roundsService.fetchGoogleSheetData(fetchGoogleSheetDto.googleSheetUrl);
  }

  @Post('evaluations/by-applications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get evaluations for multiple applications' })
  @ApiResponse({ status: 200, description: 'Evaluations retrieved successfully' })
  getEvaluationsByApplications(@Body() body: { applicationIds: string[] }) {
    return this.roundsService.getEvaluationsByApplications(body.applicationIds);
  }

  @Patch('evaluation/:evaluationId/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reschedule a missed interview' })
  @ApiResponse({ status: 200, description: 'Interview scheduled for rescheduling' })
  rescheduleRound(
    @Param('evaluationId') evaluationId: string,
    @Body() rescheduleData: {
      scheduledAt: string;
      notes?: string;
      interviewMode?: string;
      platform?: string;
      meetingLink?: string;
      duration?: string;
      reportingTime?: string;
      locationDetails?: any;
    }
  ) {
    return this.roundsService.rescheduleRound(evaluationId, rescheduleData);
  }
}
