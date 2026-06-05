import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  /** Animation duration in ms. Default 800. */
  duration?: number;
  className?: string;
}

// ease-out cubic — gentle deceleration
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up from 0 to `value` once on mount (and whenever `value` changes),
 * giving figures a small, calming sense of life.
 */
export function AnimatedNumber({ value, duration = 800, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * easeOut(progress)));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}

export default AnimatedNumber;
