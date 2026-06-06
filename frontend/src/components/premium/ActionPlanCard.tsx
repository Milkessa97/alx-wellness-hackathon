import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Wind,
  BookOpen,
  Footprints,
  Users,
  Brain,
  Moon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch, APIError } from '../../lib/api';

interface PlanItem {
  id: string | number;
  text: string;
  category: string;
  done: boolean;
}

interface ActionPlan {
  plan_date: string;
  items: PlanItem[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  breathing: Wind,
  journaling: BookOpen,
  movement: Footprints,
  social: Users,
  mindfulness: Brain,
  sleep: Moon,
};

function iconFor(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Sparkles;
}

function ActionPlanCard() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);

    apiFetch<ActionPlan>('/api/action-plan/today')
      .then((plan) => {
        if (cancelled) return;
        setItems(plan.items ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof APIError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDone = async (item: PlanItem) => {
    const nextDone = !item.done;
    const previous = items;

    // Optimistic update.
    setItems((curr) =>
      curr.map((it) => (it.id === item.id ? { ...it, done: nextDone } : it))
    );

    try {
      await apiFetch(`/api/action-plan/item/${item.id}/done`, {
        method: 'PATCH',
        body: JSON.stringify({ done: nextDone }),
      });
    } catch {
      // Revert on failure.
      setItems(previous);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ── Empty (no plan today) ────────────────────────────────────────────
  if (notFound) {
    return (
      <p className="py-8 text-center text-sm italic text-gray-400">
        Your daily plan will arrive in tomorrow's email 🌿
      </p>
    );
  }

  // ── Error (non-404) ──────────────────────────────────────────────────
  if (error) {
    return (
      <p className="py-8 text-center text-sm italic text-gray-400">
        We couldn't load your plan right now. Please try again later.
      </p>
    );
  }

  const total = items.length;
  const doneCount = items.filter((it) => it.done).length;
  const pct = total === 0 ? 0 : (doneCount / total) * 100;

  // Done items sorted to the bottom (stable).
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div>
      {/* Progress */}
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-gray-500">
          {doneCount} of {total} complete
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-sage-400"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-2">
        {sorted.map((item) => {
          const Icon = iconFor(item.category);
          return (
            <motion.li
              key={item.id}
              layout
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5"
            >
              <Icon className="h-5 w-5 shrink-0 text-sage-600" />

              <span
                className={`flex-1 text-sm ${
                  item.done ? 'text-gray-400 line-through' : 'text-slate-700'
                }`}
              >
                {item.text}
              </span>

              <button
                type="button"
                onClick={() => toggleDone(item)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                  item.done
                    ? 'bg-sage-100 text-[#4A6B4C]'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {item.done ? '✓ Done' : 'Mark Done'}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default ActionPlanCard;
