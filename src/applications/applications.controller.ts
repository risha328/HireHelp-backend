import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.schema';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  create(@Body() createApplicationDto: CreateApplicationDto, @Request() req) {
    return this.applicationsService.create(createApplicationDto, req.user.userId);
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string }
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.notes);
  }
}
