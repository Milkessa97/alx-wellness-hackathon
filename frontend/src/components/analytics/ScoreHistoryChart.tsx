import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { AssessmentRecord } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

interface ScoreHistoryChartProps {
  history: AssessmentRecord[];
}

export function ScoreHistoryChart({ history }: ScoreHistoryChartProps) {
  // If fewer than 2 records: show the beautifully formatted dashed key-metric placeholder state
  if (!history || history.length < 2) {
    return (
      <Card className="border border-dashed border-ivory-300 bg-white shadow-none p-8 flex flex-col items-center justify-center text-center gap-3 w-full">
        <div className="p-3 bg-ivory-50 rounded-full border border-ivory-200 shrink-0">
          <TrendingUp className="w-5 h-5 text-ink-light" />
        </div>
        <p className="text-sm font-semibold text-ink-light leading-relaxed max-w-sm">
          Complete more check-ins to see your trend
        </p>
      </Card>
    );
  }

  // Sort history records chronologically (oldest to newest) for charting
  const sortedHistory = [...history].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());

  const chartData = sortedHistory.map((item) => {
    const d = new Date(item.taken_at);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: item.score,
      tier: item.tier,
    };
  });

  // Custom styled Tooltip showing date + score + tier badge
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const tierBadge = data.tier === 'elevated' ? (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold rounded-full border border-amber-200 uppercase tracking-wider select-none">
          ⚠ Elevated
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-full border border-sage-200 uppercase tracking-wider select-none">
          ✓ Safe
        </span>
      );

      return (
        <div className="bg-white border border-ivory-200 p-3 rounded-xl shadow-warm-sm space-y-1.5 text-left font-sans select-none pointer-events-none">
          <p className="font-mono text-[10px] text-ink-light font-bold">{data.date}</p>
          <p className="font-bold text-xs text-ink-soft">
            Score: <span className="font-mono text-sm">{data.score}</span> <span className="text-[10px] font-normal text-ink-light">/ 27</span>
          </p>
          <div>{tierBadge}</div>
        </div>
      );
    }
    return null;
  };

  // Custom dot rendering function to assign appropriate soft tones (sage-400 or amber-400)
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;
    const tierColor = payload.tier === 'elevated' ? '#F5B942' : '#7FAF93'; // amber-400 or sage-400
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5} 
        fill={tierColor} 
        stroke="#1A1A1A" 
        strokeWidth={1.5} 
        className="transition-all hover:r-6"
      />
    );
  };

  return (
    <Card variant="default" className="w-full">
      <CardHeader>
        <CardTitle className="text-ink-soft select-none">
          Your score over time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FAF7F0" vertical={false} />
              
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6B6B6B', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#EDE3CC' }}
              />
              
              <YAxis 
                domain={[0, 27]} 
                ticks={[0, 9, 14, 15, 20, 27]}
                tick={{ fill: '#6B6B6B', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#EDE3CC', strokeWidth: 1 }} />
              
              {/* Reference thresholds */}
              <ReferenceLine 
                y={9} 
                stroke="#7FAF93" // sage-400
                strokeDasharray="4 4" 
                label={{ value: 'Minimal', fill: '#7FAF93', fontSize: 9, position: 'insideBottomRight', offset: 5 }} 
              />
              <ReferenceLine 
                y={14} 
                stroke="#F5B942" // amber-400
                strokeDasharray="4 4" 
                label={{ value: 'Moderate', fill: '#F5B942', fontSize: 9, position: 'insideBottomRight', offset: 5 }} 
              />
              <ReferenceLine 
                y={15} 
                stroke="#E87B73" // rose-400
                strokeDasharray="4 4" 
                label={{ value: 'Severe', fill: '#E87B73', fontSize: 9, position: 'insideTopRight', offset: 5 }} 
              />

              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#1A1A1A" // ink
                strokeWidth={2} 
                isAnimationActive={true}
                dot={<CustomDot />}
                activeDot={{ r: 7, stroke: '#1A1A1A', strokeWidth: 1.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoreHistoryChart;
