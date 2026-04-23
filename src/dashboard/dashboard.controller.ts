import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../users/user.schema';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('company-admin')
  @Roles(Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Aggregate dashboard payload for company admin' })
  getCompanyAdminDashboard(@Request() req: any) {
    return this.dashboardService.getCompanyAdminDashboard(req.user.userId, req.user.companyId?.toString?.());
  }

  @Get('candidate')
  @Roles(Role.CANDIDATE)
  @ApiOperation({ summary: 'Aggregate dashboard payload for candidate' })
  getCandidateDashboard(@Request() req: any) {
    return this.dashboardService.getCandidateDashboard(req.user.userId);
  }

  @Get('super-admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aggregate dashboard payload for super admin' })
  getSuperAdminDashboard() {
    return this.dashboardService.getSuperAdminDashboard();
  }
}
