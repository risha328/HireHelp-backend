import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.schema';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Post()
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetterFile', maxCount: 1 },
  ]))
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
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
