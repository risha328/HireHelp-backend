import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { Application, ApplicationDocument } from '../applications/application.schema';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { EvaluationStatus, RoundEvaluation, RoundEvaluationDocument } from '../rounds/round-evaluation.schema';
import { Role, User, UserDocument } from '../users/user.schema';
import { CandidateDashboardDto } from './dto/candidate-dashboard.dto';
import { CompanyAdminDashboardDto } from './dto/company-admin-dashboard.dto';
import { SuperAdminDashboardDto } from './dto/super-admin-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RoundEvaluation.name) private readonly roundEvaluationModel: Model<RoundEvaluationDocument>,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getCompanyAdminDashboard(userId: string, requestCompanyId?: string): Promise<CompanyAdminDashboardDto> {
    const companyId = await this.resolveCompanyId(userId, requestCompanyId);
    if (!companyId) {
      return {
        company: null,
        stats: { activeJobs: 0, totalApplications: 0, teamMembers: 0, interviewsScheduled: 0 },
        jobPerformanceData: [],
        applicationSourceData: [],
        recentActivities: [],
        hiredCandidates: [],
        acceptedOfferCount: 0,
      };
    }

    const companyObjectId = this.toObjectIdIfPossible(companyId);
    const companyMatch = companyObjectId
      ? { $or: [{ companyId: companyObjectId }, { companyId }] }
      : { companyId };

    const teamMemberCompanyMatch = companyObjectId
      ? { $or: [{ companyId }, { companyId: String(companyObjectId) }] }
      : { companyId };

    const [company, jobs, applications, teamMembers, interviewsScheduled, jobPerformanceData, appStats] = await Promise.all([
      this.companyModel.findById(companyId).exec(),
      this.jobModel.find(companyMatch).sort({ createdAt: -1 }).exec(),
      this.applicationModel
        .find(companyMatch)
        .populate('candidateId', 'name email')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments({ ...teamMemberCompanyMatch, role: { $in: [Role.COMPANY_ADMIN, Role.INTERVIEWER] } }).exec(),
      this.countUpcomingInterviewsForCompany(companyId),
      this.analyticsService.getCompanyJobPerformance(companyId),
      this.analyticsService.getCompanyApplicationStats(companyId),
    ]);

    const colors: Record<string, string> = {
      APPLIED: '#3b82f6',
      UNDER_REVIEW: '#f59e0b',
      SHORTLISTED: '#8b5cf6',
      HIRED: '#10b981',
      REJECTED: '#ef4444',
      HOLD: '#6b7280',
    };

    const recentJobs = jobs.slice(0, 5).map((job: any) => ({
      id: `job-${job._id}`,
      action: 'Job published',
      target: job.title,
      time: new Date(job.createdAt).toLocaleString(),
      type: 'published' as const,
      sortAt: new Date(job.createdAt).toISOString(),
    }));

    const recentApplications = applications.slice(0, 5).map((app: any) => ({
      id: `app-${app._id}`,
      action: 'New application received',
      target: `${app.candidateId?.name || 'Candidate'} - ${app.jobId?.title || 'Job'}`,
      time: new Date(app.createdAt).toLocaleString(),
      type: 'application' as const,
      count: applications.filter((a: any) => String(a.jobId?._id || '') === String(app.jobId?._id || '')).length,
      sortAt: new Date(app.createdAt).toISOString(),
    }));

    const recentActivities = [...recentJobs, ...recentApplications]
      .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
      .slice(0, 5);

    // "Hiring candidates" on the UI includes offer pipeline, not only finalized hires.
    const hiringCandidates = applications.filter(
      (app: any) =>
        app.status === 'HIRED' ||
        !!app.offerLetterUrl ||
        app.offerAccepted === true ||
        app.offerAccepted === false,
    );
    const acceptedOfferCount = applications.filter((app: any) => app.offerAccepted === true).length;

    const hiredCandidates = hiringCandidates.slice(0, 5).map((app: any) => ({
      id: String(app._id),
      name: app.candidateId?.name || 'Candidate',
      position: app.jobId?.title || 'Job',
      hireDate: new Date(app.offerAcceptedAt || app.updatedAt || app.createdAt).toLocaleDateString(),
      email: app.candidateId?.email || '',
      offerStatus: this.getOfferStatus(app),
    }));

    return {
      company: company ?? null,
      stats: {
        activeJobs: jobs.filter((job: any) => job.status === 'active').length,
        totalApplications: applications.length,
        teamMembers,
        interviewsScheduled,
      },
      jobPerformanceData: Array.isArray(jobPerformanceData) ? jobPerformanceData : [],
      applicationSourceData: (Array.isArray(appStats) ? appStats : []).map((s: any) => ({
        name: String(s.status || '').replace('_', ' '),
        value: Number(s.count || 0),
        color: colors[String(s.status || '')] || '#94a3b8',
      })),
      recentActivities,
      hiredCandidates,
      acceptedOfferCount,
    };
  }

  async getCandidateDashboard(userId: string): Promise<CandidateDashboardDto> {
    const applications = await this.applicationModel
      .find({ candidateId: userId })
      .populate({
        path: 'jobId',
        select: 'title companyId location salary jobType',
        populate: { path: 'companyId', select: 'name logoUrl' },
      })
      .populate('companyId', 'name')
      .populate('currentRound', 'name type mode externalLink durationMinutes')
      .sort({ createdAt: -1 })
      .exec();

    const byStatus = applications.reduce<Record<string, number>>((acc, app: any) => {
      const status = app.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const offersSent = applications.filter((app: any) => !!app.offerLetterUrl).length;
    const offersAccepted = applications.filter((app: any) => app.offerAccepted === true).length;
    const offersDeclined = applications.filter((app: any) => app.offerAccepted === false).length;
    const offersPending = applications.filter((app: any) => app.offerLetterUrl && (app.offerAccepted === null || app.offerAccepted === undefined)).length;

    const acceptedOffers = applications.filter((app: any) => app.status === 'HIRED' && app.offerAccepted === true);
    const docsCompleted = acceptedOffers.filter((app: any) => app.documentStatus === 'completed').length;
    const readyToJoin = acceptedOffers.filter(
      (app: any) => app.documentStatus === 'completed' && app.backgroundVerificationStatus === 'VERIFIED',
    ).length;
    const converted = acceptedOffers.filter((app: any) => app.convertedToEmployee === true).length;

    return {
      applications: applications as any[],
      summary: {
        totalApplications: applications.length,
        byStatus,
        offers: {
          sent: offersSent,
          accepted: offersAccepted,
          declined: offersDeclined,
          pending: offersPending,
        },
        onboarding: {
          totalAcceptedOffers: acceptedOffers.length,
          docsCompleted,
          readyToJoin,
          converted,
        },
      },
    };
  }

  async getSuperAdminDashboard(): Promise<SuperAdminDashboardDto> {
    const [companies, candidates, jobs, applications, companyGrowth, hiringActivity, topCompanies, pendingVerificationCount] =
      await Promise.all([
        this.companyModel.countDocuments().exec(),
        this.userModel.countDocuments({ role: Role.CANDIDATE }).exec(),
        this.jobModel.countDocuments().exec(),
        this.applicationModel.countDocuments().exec(),
        this.analyticsService.getCompanyGrowth(),
        this.analyticsService.getHiringActivity(),
        this.analyticsService.getTopCompanies(),
        this.companyModel.countDocuments({ verificationStatus: 'pending' }).exec(),
      ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let cumulative = 0;
    const companyGrowthData = [...(Array.isArray(companyGrowth) ? companyGrowth : [])]
      .sort((a: any, b: any) => String(a.period).localeCompare(String(b.period)))
      .map((item: any) => {
        const period = String(item.period || '');
        const month = period.includes('-') ? period.split('-')[1] : '01';
        cumulative += Number(item.count || 0);
        return {
          month: monthNames[Math.max(0, Math.min(11, Number(month) - 1))],
          companies: cumulative,
          growth: Number(item.count || 0),
        };
      });

    const hiringActivityData = [...(Array.isArray(hiringActivity) ? hiringActivity : [])]
      .sort((a: any, b: any) => String(a.period).localeCompare(String(b.period)))
      .slice(-4)
      .map((item: any, index: number) => ({
        week: `W${index + 1}`,
        jobs: Number(item.jobs || 0),
        applications: Number(item.applications || 0),
      }));

    return {
      kpiData: {
        companies: { value: String(companies) },
        candidates: { value: String(candidates) },
        jobs: { value: String(jobs) },
        applications: { value: String(applications) },
      },
      companyGrowthData,
      hiringActivityData,
      topCompanies: Array.isArray(topCompanies) ? topCompanies : [],
      pendingVerificationCount,
    };
  }

  private async resolveCompanyId(userId: string, requestCompanyId?: string): Promise<string | null> {
    if (requestCompanyId) return String(requestCompanyId);
    const user = await this.userModel.findById(userId).select('companyId').exec();
    return user?.companyId ? String(user.companyId) : null;
  }

  private toObjectIdIfPossible(id: string): Types.ObjectId | null {
    try {
      return new Types.ObjectId(id);
    } catch {
      return null;
    }
  }

  private async countUpcomingInterviewsForCompany(companyId: string): Promise<number> {
    const companyObjectId = this.toObjectIdIfPossible(companyId);
    const today = new Date();
    const excludedStatuses = [EvaluationStatus.COMPLETED, EvaluationStatus.PASSED, EvaluationStatus.FAILED, EvaluationStatus.MISSED, EvaluationStatus.SKIPPED];

    const result = await this.roundEvaluationModel.aggregate([
      {
        $match: {
          scheduledAt: { $gte: today },
          status: { $nin: excludedStatuses },
        },
      },
      {
        $lookup: {
          from: 'applications',
          localField: 'applicationId',
          foreignField: '_id',
          as: 'application',
        },
      },
      { $unwind: '$application' },
      {
        $match: {
          $or: [
            { 'application.companyId': companyObjectId },
            { 'application.companyId': companyId },
          ],
        },
      },
      { $count: 'count' },
    ]);

    return Number(result?.[0]?.count || 0);
  }

  private getOfferStatus(app: any): 'not_sent' | 'accepted' | 'pending' | 'declined' {
    if (!app.offerLetterUrl) return 'not_sent';
    if (app.offerAccepted === true) return 'accepted';
    if (app.offerAccepted === false) return 'declined';
    return 'pending';
  }
}
