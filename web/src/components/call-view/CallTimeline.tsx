import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiTimeLine } from '@remixicon/react';

interface TimelineEvent {
  timestamp: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface CallTimelineProps {
  events: TimelineEvent[];
}

export function CallTimeline({ events }: CallTimelineProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle>Call Timeline</CardTitle>
        <RiTimeLine className='h-5 w-5 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <div className='space-y-3 max-h-[350px] overflow-y-auto pr-2'>
          {events.map((event, index) => (
            <div key={index} className='flex gap-3'>
              <div className='flex flex-col items-center'>
                <div
                  className={`w-3 h-3 rounded-full ${
                    event.type === 'error'
                      ? 'bg-red-500'
                      : event.type === 'warning'
                      ? 'bg-amber-500'
                      : event.type === 'success'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                />
                {index < events.length - 1 && (
                  <div className='w-0.5 h-full bg-border' />
                )}
              </div>
              <div className='pb-4'>
                <div className='text-xs font-mono text-muted-foreground'>
                  {event.timestamp}
                </div>
                <div className='text-sm font-medium'>{event.description}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
