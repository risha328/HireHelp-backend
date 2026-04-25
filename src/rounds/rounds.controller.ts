import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { SubmitMcqDto } from './dto/submit-mcq.dto';
import { FetchGoogleSheetDto } from './dto/fetch-google-sheet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluationStatus } from './round-evaluation.schema';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/user.schema';
import { CreateQuestionBankItemDto } from './dto/create-question-bank-item.dto';
import { UpdateQuestionBankItemDto } from './dto/update-question-bank-item.dto';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { StartExamDto } from './dto/start-exam.dto';
import { SaveExamAnswerDto } from './dto/save-exam-answer.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExternalSyncDto } from './dto/external-sync.dto';

@ApiTags('rounds')
@Controller('rounds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) { }

  @Get(':id/mcq-questions')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get fully populated MCQ questions for a round' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  getRoundQuestions(@Param('id') id: string) {
    return this.roundsService.getRoundQuestions(id);
  }

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
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
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

  @Patch(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a round' })
  @ApiResponse({ status: 200, description: 'Round updated successfully' })
  update(@Param('id') id: string, @Body() updateRoundDto: UpdateRoundDto) {
    return this.roundsService.update(id, updateRoundDto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a round' })
  @ApiResponse({ status: 200, description: 'Round deleted successfully' })
  remove(@Param('id') id: string) {
    return this.roundsService.remove(id);
  }

  @Patch(':id/archive')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Archive a round' })
  @ApiResponse({ status: 200, description: 'Round archived successfully' })
  archive(@Param('id') id: string) {
    return this.roundsService.archive(id);
  }

  @Patch(':id/activate')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate a round' })
  @ApiResponse({ status: 200, description: 'Round activated successfully' })
  activate(@Param('id') id: string) {
    return this.roundsService.activate(id);
  }

  @Post(':roundId/assign/:applicationId')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
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
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Update evaluation status' })
  @ApiResponse({ status: 200, description: 'Evaluation status updated successfully' })
  updateEvaluationStatus(
    @Param('evaluationId') evaluationId: string,
    @Body() body: { status: EvaluationStatus; notes?: string; feedback?: string; score?: number; recommendation?: 'hire' | 'hold' | 'reject' },
  ) {
    return this.roundsService.updateEvaluationStatus(evaluationId, body.status, body.notes, body.feedback, body.score, body.recommendation);
  }

  @Get(':roundId/evaluations')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get round evaluations' })
  @ApiResponse({ status: 200, description: 'Round evaluations retrieved successfully' })
  getRoundEvaluations(@Param('roundId') roundId: string) {
    return this.roundsService.getRoundEvaluations(roundId);
  }


  @Post(':roundId/mcq/submit')
  @Roles(Role.CANDIDATE)
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
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get MCQ responses for a round (Admin only)' })
  @ApiResponse({ status: 200, description: 'MCQ responses retrieved successfully' })
  getMcqResponses(@Param('roundId') roundId: string) {
    return this.roundsService.getMcqResponses(roundId);
  }

  @Get(':roundId/jobs/:jobId/top-performers')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get top performers for an MCQ round and job' })
  @ApiResponse({ status: 200, description: 'Top performers retrieved successfully' })
  getTopPerformers(
    @Param('roundId') roundId: string,
    @Param('jobId') jobId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.roundsService.getTopPerformers(roundId, jobId, parsedLimit);
  }

  @Get(':roundId/application/:applicationId/mcq/status')
  @Roles(Role.CANDIDATE, Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get MCQ submission status for an application' })
  @ApiResponse({ status: 200, description: 'MCQ status retrieved successfully' })
  getMcqStatus(@Param('roundId') roundId: string, @Param('applicationId') applicationId: string) {
    return this.roundsService.getMcqStatus(roundId, applicationId);
  }

  @Get('application/:applicationId/mcq/status')
  @Roles(Role.CANDIDATE, Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get MCQ submission status for an application (legacy route)' })
  @ApiResponse({ status: 200, description: 'MCQ status retrieved successfully' })
  getMcqStatusLegacy(@Param('applicationId') applicationId: string) {
    return this.roundsService.getMcqStatusByApplication(applicationId);
  }

  @Get('mcq/responses/all')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all MCQ responses for the company admin' })
  @ApiResponse({ status: 200, description: 'MCQ responses retrieved successfully' })
  getAllMcqResponses(@Req() req: any) {
    return this.roundsService.getAllMcqResponses(req.user.companyId);
  }

  @Post('fetch-google-sheet')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Fetch data from a Google Sheets URL' })
  @ApiResponse({ status: 200, description: 'Google Sheets data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Google Sheets URL' })
  fetchGoogleSheet(@Body() fetchGoogleSheetDto: FetchGoogleSheetDto) {
    return this.roundsService.fetchGoogleSheetData(fetchGoogleSheetDto.googleSheetUrl);
  }

  @Post('evaluations/by-applications')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get evaluations for multiple applications' })
  @ApiResponse({ status: 200, description: 'Evaluations retrieved successfully' })
  getEvaluationsByApplications(@Body() body: { applicationIds: string[] }) {
    return this.roundsService.getEvaluationsByApplications(body.applicationIds);
  }

  @Post('evaluations/ensure')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Ensure evaluation exists for application and round (create if missing)' })
  @ApiResponse({ status: 200, description: 'Evaluation found or created' })
  ensureEvaluationForSchedule(@Body() body: { applicationId: string; roundId: string }) {
    return this.roundsService.ensureEvaluationForSchedule(body.applicationId, body.roundId);
  }

  @Patch('evaluation/:evaluationId/reschedule')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN, Role.INTERVIEWER)
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

  @Post('question-bank')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  createQuestionBankItem(@Req() req: any, @Body() dto: CreateQuestionBankItemDto) {
    return this.roundsService.createQuestionBankItem(req.user.companyId, dto);
  }

  @Get('question-bank')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  listQuestionBank(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('questionType') questionType?: string,
  ) {
    return this.roundsService.listQuestionBank(req.user.companyId, {
      category,
      difficulty,
      search,
      questionType,
    });
  }

  @Patch('question-bank/:id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  updateQuestionBankItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateQuestionBankItemDto) {
    return this.roundsService.updateQuestionBankItem(req.user.companyId, id, dto);
  }

  @Delete('question-bank/:id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  deleteQuestionBankItem(@Req() req: any, @Param('id') id: string) {
    return this.roundsService.deleteQuestionBankItem(req.user.companyId, id);
  }

  @Post('question-sets')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  createQuestionSet(@Req() req: any, @Body() dto: CreateQuestionSetDto) {
    return this.roundsService.createQuestionSet(req.user.companyId, dto);
  }

  @Get('question-sets')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  listQuestionSets(@Req() req: any) {
    return this.roundsService.listQuestionSets(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a round by ID' })
  @ApiResponse({ status: 200, description: 'Round retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.roundsService.findOne(id);
  }

  @Patch('question-sets/:id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  updateQuestionSet(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateQuestionSetDto) {
    return this.roundsService.updateQuestionSet(req.user.companyId, id, dto);
  }

  @Post('question-sets/:id/questions')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  addQuestionsToSet(@Req() req: any, @Param('id') id: string, @Body() body: { questionIds: string[] }) {
    return this.roundsService.addQuestionsToSet(req.user.companyId, id, body.questionIds || []);
  }

  @Post(':roundId/exam/start')
  @Roles(Role.CANDIDATE)
  startExam(@Req() req: any, @Param('roundId') roundId: string, @Body() dto: StartExamDto) {
    return this.roundsService.startExam(roundId, dto.applicationId, req.user.userId);
  }

  @Patch(':roundId/exam/answer')
  @Roles(Role.CANDIDATE)
  saveExamAnswer(@Req() req: any, @Param('roundId') roundId: string, @Body() dto: StartExamDto & SaveExamAnswerDto) {
    return this.roundsService.saveExamAnswer(roundId, dto.applicationId, req.user.userId, dto.questionIndex, dto.answer);
  }

  @Post(':roundId/exam/submit')
  @Roles(Role.CANDIDATE)
  submitExam(@Req() req: any, @Param('roundId') roundId: string, @Body() dto: SubmitExamDto) {
    return this.roundsService.submitExam(roundId, dto.applicationId, req.user.userId);
  }

  @Get(':roundId/exam/session/:applicationId')
  @Roles(Role.CANDIDATE)
  getExamSession(@Req() req: any, @Param('roundId') roundId: string, @Param('applicationId') applicationId: string) {
    return this.roundsService.getExamSession(roundId, applicationId, req.user.userId);
  }

  @Post(':roundId/external/sync')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  syncExternalRound(@Param('roundId') roundId: string, @Body() dto: ExternalSyncDto) {
    return this.roundsService.syncExternalRound(roundId, dto.googleSheetUrl);
  }

  @Get('analytics/company')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  getCompanyMcqAnalytics(@Req() req: any) {
    return this.roundsService.getCompanyMcqAnalytics(req.user.companyId);
  }
}
