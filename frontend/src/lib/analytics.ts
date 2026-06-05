import { AssessmentRecord, AnalyticsData } from '../types';

const STORAGE_KEY = 'phq9_reflect_history';

export function saveAssessmentRecord(score: number, tier: string): void {
  // Never save crisis tier records — protect user privacy
  if (tier === 'crisis') return;

  const record: AssessmentRecord = {
    id: Date.now().toString(),
    taken_at: new Date().toISOString(),
    score,
    tier: tier as 'safe' | 'elevated',
  };

  const existing = loadAnalytics();
  existing.history.push(record);
  // Keep last 30 records only
  if (existing.history.length > 30) {
    existing.history = existing.history.slice(-30);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function loadAnalytics(): AnalyticsData {
  if (typeof window === 'undefined') return { history: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { history: [] };
  } catch {
    return { history: [] };
  }
}

export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
}
