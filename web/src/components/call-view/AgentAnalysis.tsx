import { AreaChart } from '@/components/ui/areachart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  React.useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prevData) => {
        const newData = [...prevData];
        newData.shift();
        const lastIndex = parseInt(newData[newData.length - 1].timestamp);
        newData.push({
          timestamp: `${lastIndex + 1}:00`,
          politenessScore: 0.5 + Math.random() * 0.5,
          deflectionRating: 0.5 + Math.random() * 0.4,
          frustrationLevel: 0.5 + Math.random() * 0.4,
        });
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get the most recent values for each metric
  const latestData = chartData[chartData.length - 1];

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle>Agent Analysis</CardTitle>
      </CardHeader>
      <CardContent className='flex items-center gap-6 mt-2'>
        <div className='w-full grid grid-cols-3 gap-12'>
          <div className='w-full'>
            <h4 className='text-sm text-muted-foreground'>Politeness Score</h4>
            <p className='text-3xl font-bold mt-1 mb-2'>
              {latestData.politenessScore.toFixed(2)}
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
          <div className='w-full'>
            <h4 className='text-sm text-muted-foreground'>Deflection Rating</h4>
            <p className='text-3xl font-bold mt-1 mb-2'>
              {latestData.deflectionRating.toFixed(2)}
            </p>
            <AreaChart
              className='w-full transition-all duration-1000 ease-in-out h-24'
              data={chartData}
              index='timestamp'
              categories={['deflectionRating']}
              showXAxis={false}
              showYAxis={false}
              showGridLines={false}
              showLegend={false}
              showTooltip={false}
            />
          </div>
          <div className='w-full'>
            <h4 className='text-sm text-muted-foreground'>Frustration Level</h4>
            <p className='text-3xl font-bold mt-1 mb-2'>
              {latestData.frustrationLevel.toFixed(2)}
            </p>
            <AreaChart
              className='w-full transition-all duration-1000 ease-in-out h-24'
              data={chartData}
              index='timestamp'
              categories={['frustrationLevel']}
              showXAxis={false}
              showYAxis={false}
              showGridLines={false}
              showLegend={false}
              showTooltip={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
