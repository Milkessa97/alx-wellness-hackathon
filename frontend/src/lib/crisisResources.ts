import { CrisisResource } from '../types';

/**
 * Default crisis support resources, shown when the API does not supply its own.
 * Shared by the inline CrisisResult view and the focused CrisisModal overlay.
 */
export const DEFAULT_CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    detail:
      'Free, confidential, and available 24/7/365 to anyone in suicidal crisis or emotional distress. Call or text 988.',
    url: 'https://988lifeline.org',
  },
  {
    name: 'Crisis Text Line',
    detail:
      'Connect with a volunteer crisis counselor 24/7/365 for free mental health support via SMS message. Text HOME to 741741.',
    url: 'https://www.crisistextline.org',
  },
  {
    name: 'The Trevor Project',
    detail:
      'Specialized, welcoming suicide prevention and crisis counseling services for LGBTQ+ BIPOC youth. Call 1-866-488-7386 or text START to 678-678.',
    url: 'https://www.thetrevorproject.org',
  },
];

export const CRISIS_DISCLAIMER =
  'Disclaimer: This screening tool does not replace a physical psychiatric investigation or diagnostic medical visit. If you recognize acute discomfort, anxiety, or ideas of physical harm, please involve accredited clinical experts.';
