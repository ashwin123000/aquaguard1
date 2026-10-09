// Common shared types

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
export type ReadState = 'UNREAD' | 'READ';
export type DataQuality = 'VALID' | 'STALE' | 'MISSING' | 'IMPLAUSIBLE' | 'SIMULATED';

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface DemoTimestamped {
  demoCreatedAt: string;
  demoUpdatedAt: string;
}

export type AlertCategory =
  | 'WATER'
  | 'FEEDING'
  | 'GROWTH'
  | 'INVENTORY'
  | 'SYSTEM';

export type MealStatus =
  | 'UPCOMING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ADJUSTED'
  | 'OVERDUE'
  | 'ON_HOLD'
  | 'SKIPPED';

export type FeedingResponse = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'REFUSED';
export type FishActivity = 'HIGH' | 'NORMAL' | 'LOW' | 'LETHARGIC';

export type DecisionState =
  | 'GOOD_TO_GO'
  | 'UPCOMING'
  | 'MONITOR_CONDITIONS'
  | 'TEMPERATURE_RISING'
  | 'WAIT_BEFORE_FEEDING'
  | 'LOW_OXYGEN'
  | 'FEEDING_ON_HOLD'
  | 'STOP_FEEDING'
  | 'REASSESSING'
  | 'MEAL_OVERDUE'
  | 'DATA_STALE'
  | 'SENSOR_UNAVAILABLE'
  | 'SETUP_INCOMPLETE';

export type PondGateStatus =
  | 'GOOD_TO_GO'
  | 'UPCOMING'
  | 'OVERDUE'
  | 'ON_HOLD'
  | 'MONITOR'
  | 'SETUP_INCOMPLETE'
  | 'WARNING';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
