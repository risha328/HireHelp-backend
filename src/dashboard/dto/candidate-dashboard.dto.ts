export interface CandidateDashboardSummaryDto {
  totalApplications: number;
  byStatus: Record<string, number>;
  offers: {
    sent: number;
    accepted: number;
    declined: number;
    pending: number;
  };
  onboarding: {
    totalAcceptedOffers: number;
    docsCompleted: number;
    readyToJoin: number;
    converted: number;
  };
}

export interface CandidateDashboardDto {
  applications: any[];
  summary: CandidateDashboardSummaryDto;
}
