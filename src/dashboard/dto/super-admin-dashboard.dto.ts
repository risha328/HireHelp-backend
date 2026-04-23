export interface SuperAdminKpiDto {
  companies: { value: string };
  candidates: { value: string };
  jobs: { value: string };
  applications: { value: string };
}

export interface SuperAdminDashboardDto {
  kpiData: SuperAdminKpiDto;
  companyGrowthData: Array<{ month: string; companies: number; growth: number }>;
  hiringActivityData: Array<{ week: string; jobs: number; applications: number }>;
  topCompanies: Array<{
    name: string;
    jobs: number;
    applications: number;
    hires: number;
    score: number;
    engagement: number;
  }>;
  pendingVerificationCount: number;
}
