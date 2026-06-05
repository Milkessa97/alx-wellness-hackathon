import { 
  AssessmentResponse, 
  BookingFormData, 
  BookingResponse, 
  ReferralStatus, 
  HistoryResponse, 
  GateStatus 
} from '../types';
import { Session } from './auth';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export function authHeaders(session: Session | null): HeadersInit {
  if (!session?.token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.token}`
  };
}

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export async function submitAssessment(answers: number[], token:string): Promise<AssessmentResponse> {
  const response = await fetch(`${API_BASE}/api/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
     },
    body: JSON.stringify({ answers }),
  });

  if (response.status === 422) {
    throw new APIError(422, 'Invalid assessment data. Please complete all questions.');
  }
  if (response.status === 429) {
    throw new APIError(429, 'Too many assessments. Please wait a while before trying again.');
  }
  if (response.status === 502 || response.status === 503) {
    throw new APIError(response.status, 'Our reflection engine is temporarily unavailable. Please try again in a moment.');
  }
  if (!response.ok) {
    throw new APIError(response.status, 'Something went wrong. Please try again.');
  }

  return response.json();
}

export async function checkGate(token?: string): Promise<GateStatus> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}/api/gate`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new APIError(response.status, 'Failed to fetch wait gate limit status.');
  }

  return response.json();
}

export async function submitBooking(
  data: BookingFormData,
  token: string
): Promise<BookingResponse> {
  const response = await fetch(`${API_BASE}/api/referral/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status === 400) {
    throw new APIError(400, 'Crisis detected. Booking not allowed.');
  }
  if (response.status === 401) {
    throw new APIError(401, 'Unauthorized. Please sign in again.');
  }
  if (response.status === 422) {
    throw new APIError(422, 'Invalid booking data.');
  }
  if (!response.ok) {
    throw new APIError(response.status, 'Failed to submit booking.');
  }

  return response.json();
}

export async function fetchReferralStatus(
  referralId: string,
  token: string
): Promise<ReferralStatus> {
  const response = await fetch(`${API_BASE}/api/referral/status/${referralId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, 'Failed to fetch referral status.');
  }

  return response.json();
}

export async function fetchHistory(token: string): Promise<HistoryResponse> {
  const response = await fetch(`${API_BASE}/api/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, 'Failed to fetch history.');
  }

  return response.json();
}

export async function deleteHistory(token: string): Promise<{ deleted: boolean; count: number }> {
  const response = await fetch(`${API_BASE}/api/history`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new APIError(response.status, 'Failed to delete history.');
  }

  return response.json();
}
