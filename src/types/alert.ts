import type { Severity, AlertStatus, ReadState, AlertCategory } from './common';

export interface Alert {
  id: string; // unique event ID
  stableKey: string; // for deduplication - same condition = same key
  pondId: string | null; // null = FARM scope
  category: AlertCategory;
  severity: Severity;
  title: string;
  description: string;
  observation: string; // actual triggering observation
  demoCreatedAt: string;
  demoUpdatedAt: string;
  status: AlertStatus;
  readState: ReadState;
  recommendedAction: string;
  // Related entities
  relatedMealId: string | null;
  relatedWaterReadingId: string | null;
  relatedBatchId: string | null;
  relatedPondId: string | null;
  // Resolution
  resolutionCondition: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  dismissedAt: string | null;
  dismissedReason: string | null;
}
