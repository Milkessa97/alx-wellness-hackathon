import { PHQ9Question, Tier, AnswerOption } from '../types';

export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';

export const PHQ9_QUESTIONS: PHQ9Question[] = [
  { id: 1, text: "Little interest or pleasure in doing things", shortLabel: "Interest & pleasure" },
  { id: 2, text: "Feeling down, depressed, or hopeless", shortLabel: "Mood" },
  { id: 3, text: "Trouble falling or staying asleep, or sleeping too much", shortLabel: "Sleep" },
  { id: 4, text: "Feeling tired or having little energy", shortLabel: "Energy" },
  { id: 5, text: "Poor appetite or overeating", shortLabel: "Appetite" },
  { id: 6, text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", shortLabel: "Self-worth" },
  { id: 7, text: "Trouble concentrating on things, such as reading the newspaper or watching television", shortLabel: "Concentration" },
  { id: 8, text: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", shortLabel: "Restlessness" },
  { id: 9, text: "Thoughts that you would be better off dead, or of hurting yourself in some way", shortLabel: "Safety" },
];

export const ANSWER_OPTIONS: AnswerOption[] = [
  { value: 0, label: "Not at all",              sublabel: "0 days" },
  { value: 1, label: "Several days",            sublabel: "1–6 days" },
  { value: 2, label: "More than half the days", sublabel: "7–11 days" },
  { value: 3, label: "Nearly every day",        sublabel: "12–14 days" },
];

// Helper: prefix text for Q9 sensitivity notice
export const Q9_NOTICE = "The next question asks about thoughts of self-harm. It is included because it matters for your wellbeing. You are safe to answer honestly.";

// Helper: check if current question is Q9 (zero-indexed: index 8)
export const isQ9 = (index: number): boolean => index === 8;

export function calculatePHQ9Severity(score: number): SeverityLevel {
  if (score >= 20) return "severe";
  if (score >= 15) return "moderately_severe";
  if (score >= 10) return "moderate";
  if (score >= 5) return "mild";
  return "minimal";
}

export function determineRiskCategory(score: number, answers: (number | null)[]): Tier {
  // If Q9 is suicidal ideation and score is > 0 (represented by index 8 of the answers), escalate to Crisis
  const q9Score = answers[8];
  if (q9Score !== null && q9Score > 0) {
    return "crisis";
  }
  
  if (score >= 20) return "crisis";
  if (score >= 10) return "elevated";
  return "safe";
}

export function getSeverityLabel(severity: SeverityLevel): string {
  switch (severity) {
    case "severe": return "Severe Depression";
    case "moderately_severe": return "Moderately Severe Depression";
    case "moderate": return "Moderate Depression";
    case "mild": return "Mild Depression";
    case "minimal": return "Minimal or No Depression";
  }
}

export function getSeverityColorClass(severity: SeverityLevel): string {
  switch (severity) {
    case "severe": return "bg-red-50 text-red-700 border-red-200";
    case "moderately_severe": return "bg-orange-50 text-orange-700 border-orange-200";
    case "moderate": return "bg-amber-50 text-amber-700 border-amber-200";
    case "mild": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "minimal": return "bg-teal-50 text-teal-700 border-teal-200";
  }
}

export const CRISIS_SERVICES = [
  {
    name: "988 Suicide & Crisis Lifeline",
    number: "988",
    description: "Free, confidential, 24/7 support for anyone in suicidal crisis or emotional distress. Call or text 988.",
    availability: "24/7/365 • Call or Text"
  },
  {
    name: "Crisis Text Line",
    number: "Text HOME to 741741",
    description: "Connect with a volunteer crisis counselor 24/7 for free mental health support via SMS.",
    availability: "24/7 • Text Support"
  },
  {
    name: "The Trevor Project (LGBTQ+)",
    number: "1-866-488-7386",
    description: "Support for LGBTQ youth. Text START to 678-678 or call.",
    availability: "24/7 • Specialized Support"
  }
];
