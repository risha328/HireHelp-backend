import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, UseInterceptors, UploadedFiles, UploadedFile, ForbiddenException } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApplicationsService } from './applications.service';
import { OnboardingService } from './onboarding.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ReviewOnboardingDocumentDto } from './dto/review-onboarding-document.dto';
import { UpdateBackgroundVerificationDto } from './dto/update-background-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.schema';
import { OfferLetterService } from '../offer-letters/offer-letter.service';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly offerLetterService: OfferLetterService,
    private readonly onboardingService: OnboardingService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileFieldsInterceptor(
    [
      { name: 'resume', maxCount: 1 },
      { name: 'coverLetterFile', maxCount: 1 },
    ],
    { storage: memoryStorage() },
  ))
  create(
    @Body() createApplicationDto: CreateApplicationDto,
    @Request() req,
    @UploadedFiles() files?: { resume?: Express.Multer.File[], coverLetterFile?: Express.Multer.File[] }
  ) {
    return this.applicationsService.create(createApplicationDto, req.user.userId, files);
  }

  @Get('company/:companyId')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  findByCompany(@Param('companyId') companyId: string) {
    return this.applicationsService.findByCompany(companyId);
  }

  @Get('candidate')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  findByCandidate(@Request() req) {
    return this.applicationsService.findByCandidate(req.user.userId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  findAll() {
    return this.applicationsService.findAll();
  }

  @Get(':applicationId/offer-download-link')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  getOfferDownloadLink(@Param('applicationId') applicationId: string, @Request() req: any) {
    return this.offerLetterService.getDownloadLinkForCandidate(applicationId, req.user.userId);
  }

  @Get(':applicationId/onboarding-documents')
  @UseGuards(RolesGuard)
  @Roles(Role.COMPANY_ADMIN, Role.CANDIDATE)
  async getOnboardingDocuments(@Param('applicationId') applicationId: string, @Request() req: any) {
    const app = await this.applicationsService.findOne(applicationId);
    const appCompanyId = (app.companyId as any)?._id?.toString?.() ?? (app.companyId as any)?.toString?.();
    const appCandidateId = (app.candidateId as any)?._id?.toString?.() ?? (app.candidateId as any)?.toString?.();
    const isCompany = req.user?.companyId && appCompanyId === req.user.companyId?.toString?.();
    const isCandidate = req.user?.userId && appCandidateId === req.user.userId?.toString?.();
    if (!isCompany && !isCandidate) throw new ForbiddenException('You do not have access to this application');
    return this.onboardingService.getChecklist(applicationId);
  }

  @Post(':applicationId/onboarding-documents/:documentId/upload')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadOnboardingDocument(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const app = await this.applicationsService.findOne(applicationId);
    const appCandidateId = (app.candidateId as any)?._id?.toString?.() ?? (app.candidateId as any)?.toString?.();
    if (appCandidateId !== req.user?.userId?.toString?.()) {
      throw new ForbiddenException('You can only upload documents for your own application');
    }
    if (!file?.buffer) throw new ForbiddenException('No file provided');
    const { secure_url } = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'hirehelp/onboarding-documents',
      { resource_type: 'raw', originalFilename: file.originalname || 'document' },
    );
    return this.onboardingService.uploadDocument(applicationId, documentId, secure_url);
  }

  @Patch(':applicationId/onboarding-documents/:documentId/review')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  async reviewOnboardingDocument(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReviewOnboardingDocumentDto,
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId?.toString?.() || req.user?.companyId;
    if (!companyId) throw new ForbiddenException('Company not found for user');
    const app = await this.applicationsService.findOne(applicationId);
    const appCompanyId = (app.companyId as any)?._id?.toString?.() ?? (app.companyId as any)?.toString?.();
    if (appCompanyId !== companyId) throw new ForbiddenException('Application does not belong to your company');
    return this.onboardingService.reviewDocument(applicationId, documentId, dto.status, dto.rejectedReason);
  }

  @Patch(':id/background-verification')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  async updateBackgroundVerification(
    @Param('id') id: string,
    @Body() dto: UpdateBackgroundVerificationDto,
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId?.toString?.() || req.user?.companyId;
    if (!companyId) throw new ForbiddenException('Company not found for user');
    const app = await this.applicationsService.findOne(id);
    const appCompanyId = (app.companyId as any)?._id?.toString?.() ?? (app.companyId as any)?.toString?.();
    if (appCompanyId !== companyId) throw new ForbiddenException('Application does not belong to your company');
    return this.onboardingService.updateBackgroundVerification(id, dto.status, dto.notes, dto.failedReason);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Post(':id/convert-to-employee')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  convertToEmployee(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user?.companyId?.toString?.() || req.user?.companyId;
    if (!companyId) throw new ForbiddenException('Company not found for user');
    return this.applicationsService.convertToEmployee(id, companyId);
  }

  @Patch(':id/status')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto
  ) {
    return this.applicationsService.updateStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.notes,
      updateStatusDto.currentRound
    );
  }
}
