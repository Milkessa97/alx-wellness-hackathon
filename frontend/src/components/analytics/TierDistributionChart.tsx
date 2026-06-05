import { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AssessmentRecord } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { loadAnalytics } from '../../lib/analytics';
import { TrendingUp } from 'lucide-react';

interface TierDistributionChartProps {
  latestResult?: AssessmentRecord;
  history?: AssessmentRecord[];
}

export function TierDistributionChart({ latestResult, history: propHistory }: TierDistributionChartProps) {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    if (propHistory) {
      setHistory(propHistory);
    } else {
      const data = loadAnalytics();
      if (data && data.history) {
        setHistory(data.history);
      }
    }
  }, [propHistory]);

  if (!history || history.length === 0) {
    return (
      <Card className="border border-dashed border-ivory-300 bg-white shadow-none p-8 flex flex-col items-center justify-center text-center gap-3 w-full h-[320px]">
        <div className="p-3 bg-ivory-50 rounded-full border border-ivory-200 shrink-0">
          <TrendingUp className="w-5 h-5 text-ink-light" />
        </div>
        <p className="text-sm font-semibold text-ink-light leading-relaxed max-w-sm">
          Complete more check-ins to see your trend
        </p>
      </Card>
    );
  }

  const safeCount = history.filter(item => item.tier === 'safe').length;
  const elevatedCount = history.filter(item => item.tier === 'elevated').length;

  const chartData = [
    { name: 'Minimal range', value: safeCount, key: 'safe' },
    { name: 'Moderate range', value: elevatedCount, key: 'elevated' }
  ].filter(d => d.value > 0);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#1A1A1A" 
        className="font-mono text-[10px] font-bold" 
        textAnchor="middle" 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const tierBadge = data.key === 'elevated' ? (
        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold rounded-full border border-amber-200 uppercase tracking-wider select-none border-amber-200/50">
          ⚠ Elevated
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-full border border-sage-200 uppercase tracking-wider select-none border-sage-200/50">
          ✓ Safe
        </span>
      );

      return (
        <div className="bg-white border border-ivory-200 p-3 rounded-xl shadow-warm-sm space-y-1.5 text-left font-sans select-none pointer-events-none">
          <p className="font-bold text-xs text-ink-soft">
            {data.name}
          </p>
          <p className="font-mono text-xs text-ink-muted">
            Sessions: <span className="font-bold text-ink-soft">{data.value}</span>
          </p>
          <div>{tierBadge}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="default" className="w-full">
      <CardHeader>
        <CardTitle className="text-ink-soft select-none">
          Your check-in breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[220px] w-full mt-2 flex items-center justify-center">
          {/* Centered label */}
          <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none z-10">
            <span className="font-display font-black text-2xl text-ink leading-none">
              {history.length}
            </span>
            <span className="text-[10px] uppercase font-mono font-bold text-ink-muted mt-1 leading-none">
              {history.length === 1 ? 'check-in' : 'check-ins'}
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => {
                  const color = entry.key === 'elevated' ? '#F5B942' : '#7FAF93';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2 mt-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7FAF93]" />
            <span>Minimal range: {safeCount} {safeCount === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
            <span>Moderate range: {elevatedCount} {elevatedCount === 1 ? 'session' : 'sessions'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TierDistributionChart;
