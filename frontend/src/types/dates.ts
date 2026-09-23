export type DateType = 
  | 'expiry_date'
  | 'renewal_date'
  | 'notice_deadline'
  | 'payment_due'
  | 'probation_end'
  | 'lock_in_end'
  | 'other';

export type ReminderStatus = 'pending' | 'sent' | 'snoozed' | 'resolved' | 'failed';

export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed';

export interface ContractDate {
  id: string;
  docId: string;
  dateType: DateType;
  rawText: string;
  resolvedDate: string; // YYYY-MM-DD
  confidence: number; // 0 to 1
  clauseId?: string;
  userConfirmed: boolean;
  isActive: boolean;
}

export interface Reminder {
  id: string;
  userId: string;
  contractDateId: string;
  contractId?: string;
  contractName?: string;
  dateType?: DateType;
  resolvedDate?: string;
  daysBefore: number;
  scheduledFor: string;
  status: ReminderStatus;
  channel: string;
  sentAt?: string;
  snoozedUntil?: string;
}

export interface ContractSummary {
  id: string;
  name: string;
  status: ContractStatus;
  expiryDate: string;
  riskScore: number;
  daysRemaining: number;
  nextReminder?: string;
  uploadDate?: string;
  documentType?: string;
  dateCount?: number;
}
