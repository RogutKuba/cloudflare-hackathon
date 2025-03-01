import { AreaChart } from '@/components/ui/areachart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallScores } from '@/query/score.query';
import { RiBarChartBoxLine } from '@remixicon/react';
import React from 'react';

interface MetricItem {
  name: string;
  value: string | number;
  percentage: number;
}

interface RedFlag {
  description: string;
  timestamp?: string;
}

interface AgentAnalysisProps {
  metrics: MetricItem[];
  redFlags: RedFlag[];
}

const generateChartData = (count = 100) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      timestamp: `${i}:00`,
      politenessScore: 0.5 + Math.random() * 0.5,
      deflectionRating: 0.5 + Math.random() * 0.4,
      frustrationLevel: 0.5 + Math.random() * 0.4,
    });
  }
  return data;
};

export function AgentAnalysis({ metrics, redFlags }: AgentAnalysisProps) {
  const [chartData, setChartData] = React.useState(generateChartData());

  const { scores, isLoading } = useCallScores();

  const latestData = Number(scores?.[scores.length - 1].politenessScore) ?? 0;

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle>Agent Analysis</CardTitle>
      </CardHeader>
      <CardContent className='flex items-center gap-6 mt-2'>
        <div className='w-full grid grid-cols-1 gap-12'>
          <div className='w-full'>
            <h4 className='text-sm text-muted-foreground'>Politeness Score</h4>
            <p className='text-3xl font-bold mt-1 mb-2'>
              {latestData.toFixed(2)}
            </p>
            <AreaChart
              data={chartData}
              index='timestamp'
              categories={['politenessScore']}
              showXAxis={false}
              showGridLines={false}
              showYAxis={false}
              showLegend={false}
              showTooltip={false}
              className='transition-all duration-1000 ease-in-out h-24'
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
