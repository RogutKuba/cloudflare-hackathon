import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCallEvents } from '@/query/event.query';
import { RiTimeLine } from '@remixicon/react';

export function CallTimeline() {
  const { events, isLoading } = useCallEvents();

  // Helper function to format call duration time
  const formatCallTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle>Timeline</CardTitle>
        <RiTimeLine className='h-5 w-5 text-muted-foreground' />
      </CardHeader>
      <CardContent className='mt-4'>
        <div className='space-y-6 max-h-[350px] overflow-y-auto pr-2'>
          {isLoading ? (
            <div className='space-y-3'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className='flex gap-3 animate-pulse'>
                  <div className='flex flex-col items-center'>
                    <Skeleton className='w-3 h-3 rounded-full bg-stone-700/30' />
                    <Skeleton className='w-0.5 h-full bg-stone-700/30' />
                  </div>
                  <div className='pb-4 flex-1'>
                    <Skeleton className='h-4 bg-stone-700/30 rounded w-1/3 mb-2' />
                    <Skeleton className='h-4 bg-stone-700/30 rounded w-2/3' />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            events?.map((event, index) => (
              <div key={index} className='flex gap-3 relative'>
                <div className='flex flex-col items-center absolute top-0 bottom-0'>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      event.type === 'error'
                        ? 'bg-red-500'
                        : event.type === 'success'
                        ? 'bg-green-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div
                    className={`w-0.5 flex-grow ${
                      event.type === 'error'
                        ? 'bg-red-500'
                        : event.type === 'success'
                        ? 'bg-green-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className='ml-6'>
                  <div className='text-xs font-mono text-muted-foreground'>
                    {formatCallTime(Math.abs(event.timeIntoCall))}
                  </div>
                  <div className='text-sm font-medium'>{event.description}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
