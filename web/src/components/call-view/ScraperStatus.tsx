import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ScraperStatusProps {
  callId: string;
}

interface ScrapedPage {
  id: string;
  url: string;
  parentUrl?: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  title?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScraperStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  queued: number;
}

interface ScraperStatusResponse {
  status: 'not_found' | 'in_progress' | 'completed' | 'failed';
  stats: ScraperStats;
  pages: ScrapedPage[];
}

export function ScraperStatus({ callId }: ScraperStatusProps) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [statusData, setStatusData] = useState<ScraperStatusResponse | null>(
    null
  );
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const startScraping = async () => {
    if (!url) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to scrape',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/scraper/${callId}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, maxPages }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scraping');
      }

      toast({
        title: 'Success',
        description: 'Scraping job started successfully',
      });

      // Start polling for status updates
      startPolling();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to start scraping',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/scraper/${callId}/scrape/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatusData(data);

      // Stop polling if the job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  useEffect(() => {
    // Check if there's an existing job when the component mounts
    fetchStatus();

    return () => {
      // Clean up interval when component unmounts
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [callId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case 'failed':
        return <XCircle className='h-5 w-5 text-red-500' />;
      case 'in_progress':
        return <Loader2 className='h-5 w-5 text-blue-500 animate-spin' />;
      default:
        return <AlertCircle className='h-5 w-5 text-gray-500' />;
    }
  };

  const getProgressPercentage = () => {
    if (!statusData || statusData.stats.total === 0) return 0;
    return Math.round(
      ((statusData.stats.completed + statusData.stats.failed) /
        statusData.stats.total) *
        100
    );
  };

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Web Scraper</CardTitle>
        <CardDescription>
          Scrape web pages starting from a URL (max 100 pages)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='url'>Starting URL</Label>
            <Input
              id='url'
              placeholder='https://example.com'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading || statusData?.status === 'in_progress'}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='maxPages'>Maximum Pages</Label>
            <Input
              id='maxPages'
              type='number'
              min='1'
              max='100'
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
              disabled={isLoading || statusData?.status === 'in_progress'}
            />
          </div>

          {statusData && statusData.status !== 'not_found' && (
            <div className='space-y-4 mt-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {getStatusIcon(statusData.status)}
                  <span className='font-medium capitalize'>
                    {statusData.status.replace('_', ' ')}
                  </span>
                </div>
                <div className='text-sm text-gray-500'>
                  {statusData.stats.completed + statusData.stats.failed} /{' '}
                  {statusData.stats.total} pages
                </div>
              </div>

              <Progress value={getProgressPercentage()} className='h-2' />

              <div className='grid grid-cols-4 gap-2 text-center text-sm'>
                <div>
                  <div className='font-medium'>
                    {statusData.stats.completed}
                  </div>
                  <div className='text-gray-500'>Completed</div>
                </div>
                <div>
                  <div className='font-medium'>{statusData.stats.failed}</div>
                  <div className='text-gray-500'>Failed</div>
                </div>
                <div>
                  <div className='font-medium'>
                    {statusData.stats.inProgress}
                  </div>
                  <div className='text-gray-500'>In Progress</div>
                </div>
                <div>
                  <div className='font-medium'>{statusData.stats.queued}</div>
                  <div className='text-gray-500'>Queued</div>
                </div>
              </div>

              {statusData.pages.length > 0 && (
                <div className='mt-4 max-h-60 overflow-y-auto border rounded-md'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          URL
                        </th>
                        <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {statusData.pages.map((page) => (
                        <tr key={page.id}>
                          <td className='px-3 py-2 text-sm text-gray-900 truncate max-w-[200px]'>
                            {page.url}
                          </td>
                          <td className='px-3 py-2 text-sm'>
                            <div className='flex items-center gap-1'>
                              {getStatusIcon(page.status)}
                              <span className='capitalize'>
                                {page.status.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={startScraping}
          disabled={isLoading || statusData?.status === 'in_progress' || !url}
          className='w-full'
        >
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Starting...
            </>
          ) : (
            'Start Scraping'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
