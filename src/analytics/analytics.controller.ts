import { Controller, Get, UseGuards } from '@nestjs/common';
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
@Roles(Role.SUPER_ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('company-growth')
  @ApiOperation({ summary: 'Get company growth data over time' })
  @ApiResponse({ status: 200, description: 'Company growth data retrieved successfully', type: [CompanyGrowthDto] })
  async getCompanyGrowth() {
    return this.analyticsService.getCompanyGrowth();
  }

  @Get('hiring-activity')
  @ApiOperation({ summary: 'Get hiring activity data (jobs vs applications)' })
  @ApiResponse({ status: 200, description: 'Hiring activity data retrieved successfully', type: [HiringActivityDto] })
  async getHiringActivity() {
    return this.analyticsService.getHiringActivity();
  }

  @Get('top-companies')
  @ApiOperation({ summary: 'Get top performing companies based on hiring activity score' })
  @ApiResponse({ status: 200, description: 'Top companies data retrieved successfully', type: [TopCompanyDto] })
  async getTopCompanies() {
    return this.analyticsService.getTopCompanies();
  }
}
