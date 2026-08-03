export interface SalesReportPoint {
  label: string;
  value: number;
}

export interface TransactionSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface TransactionAnalytics {
  headline: number;
  label: string;
  segments: TransactionSegment[];
}
