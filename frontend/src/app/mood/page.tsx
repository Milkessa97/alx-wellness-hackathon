'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

// Standalone page reached from the daily mood email link
// (/mood?token=XXX&mood=happy). It is intentionally NOT part of the App.tsx
// VIEW_MAP router and renders outside RootLayout — no app chrome, no auth.
// The mood-log endpoint authenticates via the single-use email `token`, so no
// Authorization header is sent.

const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_ERROR = 'This link has already been used or has expired.';

interface Mood {
  key: string;
  emoji: string;
  label: string;
  color: string;
}

const MOODS: Mood[] = [
  { key: 'happy', emoji: '😊', label: 'Happy', color: '#16A34A' },
  { key: 'calm', emoji: '😌', label: 'Calm', color: '#7C9A7E' },
  { key: 'tired', emoji: '😴', label: 'Tired', color: '#6366F1' },
  { key: 'anxious', emoji: '😰', label: 'Anxious', color: '#D97706' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: '#2563EB' },
  { key: 'angry', emoji: '😠', label: 'Angry', color: '#DC2626' },
];

type Status = 'loading' | 'picker' | 'success' | 'error';

// SPA navigation: matches the custom-router pattern used across the app.
function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('navigationchange'));
}

export default function MoodPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const logMood = async (mood: string) => {
    const token = tokenRef.current;
    if (!token) {
      setStatus('error');
      return;
    }

    setSelectedMood(mood);
    setStatus('loading');

    try {
      const res = await fetch(`${API_BASE}/api/mood/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mood }),
      });

      if (!res.ok) {
        let message = DEFAULT_ERROR;
        try {
          const data = await res.json();
          if (typeof data?.detail === 'string') message = data.detail;
        } catch {
          /* non-JSON body — keep the friendly default */
        }
        setErrorMessage(message);
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  // On load: read token + mood from the URL and decide what to render.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const mood = params.get('mood');
    tokenRef.current = token;

    if (!token) {
      setStatus('error');
      return;
    }
    if (mood) {
      logMood(mood);
    } else {
      setStatus('picker');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = MOODS.find((m) => m.key === selectedMood);

  return (
    <div className="min-h-screen w-full bg-ivory-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* ── Loading ───────────────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-sage-200 animate-pulse" />
            <p className="text-sm text-ink-light">Logging your mood…</p>
          </div>
        )}

        {/* ── Mood picker ───────────────────────────────────────────── */}
        {status === 'picker' && (
          <div>
            <h1 className="mb-1 text-center font-display text-2xl text-ink-soft">
              How are you feeling?
            </h1>
            <p className="mb-6 text-center text-sm text-ink-light">
              Tap the mood that fits today.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => logMood(m.key)}
                  style={{ backgroundColor: m.color }}
                  className="rounded-2xl px-6 py-4 font-medium text-white transition hover:scale-105"
                >
                  <span className="mr-2 text-xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Confirmation ──────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mb-4 text-7xl"
            >
              {selected?.emoji ?? '🌿'}
            </motion.div>
            <h1 className="mb-2 font-display text-2xl text-sage-600">
              Mood logged! 🌿
            </h1>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-2 text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-400 transition-colors"
            >
              Head back to your dashboard
            </button>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-4 text-5xl">🥀</div>
            <p className="mb-4 text-sm text-ink-muted">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-400 transition-colors"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
