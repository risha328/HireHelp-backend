export interface CompanyAdminStatsDto {
  activeJobs: number;
  totalApplications: number;
  teamMembers: number;
  interviewsScheduled: number;
}

export interface CompanyAdminActivityDto {
  id: string;
  action: string;
  target: string;
  time: string;
  type: 'published' | 'application' | 'interview' | 'update';
  count?: number;
  sortAt: string;
}

export interface CompanyAdminHiredCandidateDto {
  id: string;
  name: string;
  position: string;
  hireDate: string;
  email: string;
  offerStatus: 'not_sent' | 'accepted' | 'pending' | 'declined';
}

export interface CompanyAdminDashboardDto {
  company: any | null;
  stats: CompanyAdminStatsDto;
  jobPerformanceData: Array<{ name: string; applications: number; statuses?: Record<string, number> }>;
  applicationSourceData: Array<{ name: string; value: number; color: string }>;
  recentActivities: CompanyAdminActivityDto[];
  hiredCandidates: CompanyAdminHiredCandidateDto[];
  acceptedOfferCount: number;
}
