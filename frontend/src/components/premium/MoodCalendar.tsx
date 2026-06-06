import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface MoodEntry {
  logged_at: string; // "2025-06-01"
  mood: string;
}

// mood → Tailwind background class
const MOOD_COLORS: Record<string, string> = {
  happy: 'bg-green-500',
  calm: 'bg-[#7C9A7E]',
  tired: 'bg-indigo-400',
  anxious: 'bg-amber-400',
  sad: 'bg-blue-400',
  angry: 'bg-red-400',
};

const NO_DATA_COLOR = 'bg-gray-100';

// Legend order — the six loggable moods.
const LEGEND: { mood: string; label: string }[] = [
  { mood: 'happy', label: 'Happy' },
  { mood: 'calm', label: 'Calm' },
  { mood: 'tired', label: 'Tired' },
  { mood: 'anxious', label: 'Anxious' },
  { mood: 'sad', label: 'Sad' },
  { mood: 'angry', label: 'Angry' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.01 } },
};

const cellVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  show: { scale: 1, opacity: 1 },
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function MoodCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed (matches API)
  const [moodMap, setMoodMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch<MoodEntry[]>(`/api/mood/calendar?year=${year}&month=${month}`)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const entry of data) {
          // normalize to YYYY-MM-DD in case the backend returns a full timestamp
          map[entry.logged_at.slice(0, 10)] = entry.mood;
        }
        setMoodMap(map);
      })
      .catch(() => {
        if (!cancelled) setMoodMap({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const goPrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (isCurrentMonth) return; // never navigate into the future
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  // JS getDay(): 0=Sun..6=Sat. Convert to Monday-based offset.
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = (firstWeekday + 6) % 7;

  return (
    <div className="w-full max-w-md">
      {/* Header: prev / label / next */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="rounded-lg p-1.5 text-sage-600 hover:bg-sage-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="font-semibold text-sage-600">{monthLabel}</span>

        <button
          type="button"
          onClick={goNext}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="rounded-lg p-1.5 text-sage-600 hover:bg-sage-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <motion.div
          key={`${year}-${month}`}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-7 gap-1.5"
        >
          {/* leading blank cells for weekday offset */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <motion.div key={`blank-${i}`} variants={cellVariants} className="aspect-square" />
          ))}

          {/* day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const mood = moodMap[dateStr];
            const color = mood ? MOOD_COLORS[mood] ?? NO_DATA_COLOR : NO_DATA_COLOR;

            return (
              <motion.div
                key={dateStr}
                variants={cellVariants}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm ${color} ${
                  mood ? 'text-white' : 'text-gray-400'
                }`}
              >
                {day}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND.map(({ mood, label }) => (
          <div key={mood} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${MOOD_COLORS[mood]}`}
            />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MoodCalendar;
