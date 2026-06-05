// PHQ-9 Question type
export interface PHQ9Question {
  id: number;           // 1–9
  text: string;         // Full question text
  shortLabel: string;   // e.g. "Low energy" — used in analytics
}

// Answer options (same for all PHQ-9 questions)
export interface AnswerOption {
  value: 0 | 1 | 2 | 3;
  label: string;        // "Not at all", "Several days", etc.
  sublabel: string;     // "0 days" "1–6 days" "7–11 days" "12–14 days"
}

// Assessment state during the flow
export interface AssessmentState {
  answers: (number | null)[];  // 9 slots, null = unanswered
  currentQuestion: number;     // 0-indexed
  isSubmitting: boolean;
  error: string | null;
}

// API response types
export type Tier = 'safe' | 'elevated' | 'crisis';

export interface CrisisResource {
  name: string;
  detail: string;
  url: string;
}

export interface CrisisBlock {
  message: string;
  resources: CrisisResource[];
  disclaimer: string;
}

// Extended AssessmentResponse — trend and milestones added
export interface AssessmentResponse {
  tier: Tier;
  score: number | null;
  summary: string | null;
  crisis: CrisisBlock | null;
  disclaimer: string;
  trend: TrendData | null;
  milestones: Milestone[] | null;
  gate: { next_available: string; days_remaining: number } | null;
}

// Analytics types
export interface AssessmentRecord {
  id: string;           // uuid or timestamp string
  taken_at: string;     // ISO string
  score: number;
  tier: Tier;
  answers?: number[];   // scores of the 9 symptoms
  summary?: string | null;
  disclaimer?: string;
  crisis?: CrisisBlock | null;
}

export interface AnalyticsData {
  history: AssessmentRecord[];
}

export interface Recommendation {
  title: string;
  category: string;
  description: string;
  actionableStep: string;
}

// Extended response types
export interface TrendData {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  delta: number | null;
  message: string;
}

export interface Milestone {
  id: string;
  message: string;
}

export interface GateStatus {
  allowed: boolean;
  days_remaining: number;
  next_available: string | null;
  message: string;
}

// Referral types
export interface BookingFormData {
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string;
  phq9_score: number;
  phq9_tier: string;
}

export interface BookingResponse {
  referral_id: string;
  status: string;
  clinic_name: string;
  message: string;
}

export interface ReferralStatus {
  referral_id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'reassigned';
  clinic_name: string;
  created_at: string;
  confirmed_at: string | null;
}

// History types
export interface HistoryResponse {
  assessments: AssessmentRecord[];
  total: number;
  trend: TrendData;
  encouragement: string;
  milestones_earned: number;
}
