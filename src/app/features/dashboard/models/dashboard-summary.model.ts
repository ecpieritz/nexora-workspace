export type DashboardSummaryIcon = 'saved' | 'stock' | 'sales' | 'applications';
export type DashboardSummaryTone = 'blue' | 'yellow' | 'coral' | 'purple';

export interface DashboardSummary {
  id: string;
  label: string;
  value: number;
  suffix: string;
  icon: DashboardSummaryIcon;
  tone: DashboardSummaryTone;
}
