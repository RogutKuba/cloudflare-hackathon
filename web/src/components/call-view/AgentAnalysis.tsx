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

export function AgentAnalysis({ metrics, redFlags }: AgentAnalysisProps) {
  const { scores, isLoading } = useCallScores();

  // Format the data for the chart if scores exist
  const chartData = React.useMemo(() => {
    if (!scores || scores.length === 0) return [];

    return scores.map((score) => ({
      timestamp: score.timestamp || '',
      politenessScore: Number(score.politenessScore) || 0,
    }));
  }, [scores]);

  // Get the latest politeness score if available
  const latestScore = React.useMemo(() => {
    if (!scores || scores.length === 0) return null;
    return Number(scores[scores.length - 1].politenessScore) || 0;
  }, [scores]);

  // Loading state
  if (isLoading) {
    return (
      <Card className='min-h-[300px]'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle>Agent Analysis</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center h-[200px]'>
          <div className='animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4'></div>
          <p className='text-muted-foreground text-sm'>
            Loading analysis data...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!scores || scores.length === 0) {
    return (
      <Card className='min-h-[300px]'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center h-[200px]'>
          <RiBarChartBoxLine className='w-12 h-12 text-muted-foreground mb-4' />
          <p className='text-muted-foreground font-medium'>
            No analysis data available
          </p>
          <p className='text-muted-foreground text-sm mt-1 animate-pulse'>
            Data will appear as the call progresses
          </p>
        </CardContent>
      </Card>
    );
  }

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
              {latestScore !== null ? latestScore.toFixed(2) : 'N/A'}
            </p>
            {chartData.length > 0 && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
