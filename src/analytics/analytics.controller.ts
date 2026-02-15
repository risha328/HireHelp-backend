import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CompanyGrowthDto } from './dto/company-growth.dto';
import { HiringActivityDto } from './dto/hiring-activity.dto';
import { Role } from '../users/user.schema';
import { TopCompanyDto } from './dto/top-companies.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('company-growth')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get company growth data over time' })
  @ApiResponse({ status: 200, description: 'Company growth data retrieved successfully', type: [CompanyGrowthDto] })
  async getCompanyGrowth() {
    return this.analyticsService.getCompanyGrowth();
  }

  @Get('hiring-activity')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get hiring activity data (jobs vs applications)' })
  @ApiResponse({ status: 200, description: 'Hiring activity data retrieved successfully', type: [HiringActivityDto] })
  async getHiringActivity() {
    return this.analyticsService.getHiringActivity();
  }

  @Get('top-companies')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get top performing companies based on hiring activity score' })
  @ApiResponse({ status: 200, description: 'Top companies data retrieved successfully', type: [TopCompanyDto] })
  async getTopCompanies() {
    return this.analyticsService.getTopCompanies();
  }

  @Get('company-job-performance')
  @Roles(Role.COMPANY_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get job performance analytics for the current company' })
  async getCompanyJobPerformance(@Request() req) {
    console.log('AnalyticsController: getCompanyJobPerformance for user:', req.user.userId, 'companyId:', req.user.companyId);
    if (!req.user.companyId) {
      console.log('AnalyticsController: No companyId found in request user');
      return [];
    }
    return this.analyticsService.getCompanyJobPerformance(req.user.companyId);
  }

  @Get('company-application-stats')
  @Roles(Role.COMPANY_ADMIN, Role.INTERVIEWER)
  @ApiOperation({ summary: 'Get application stats for the current company' })
  async getCompanyApplicationStats(@Request() req) {
    console.log('AnalyticsController: getCompanyApplicationStats for user:', req.user.userId, 'companyId:', req.user.companyId);
    if (!req.user.companyId) {
      console.log('AnalyticsController: No companyId found in request user');
      return [];
    }
    return this.analyticsService.getCompanyApplicationStats(req.user.companyId);
  }
}
