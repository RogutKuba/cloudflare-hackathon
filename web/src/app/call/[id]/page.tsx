'use client';

import { TranscriptView } from '@/components/call-view/TranscriptView';
import { AgentAnalysis } from '@/components/call-view/AgentAnalysis';
import { CallTimeline } from '@/components/call-view/CallTimeline';
import { useCall } from '@/query/call.query';
import Link from 'next/link';

export default function Home() {
  const { call, isLoading, error } = useCall();

  return (
    <div className='bg-background text-foreground min-h-screen p-6'>
      <header className='mb-6'>
        <div className='flex items-center gap-2 mb-2'>
          <Link
            href='/calls'
            className='hover:underline flex items-center gap-1'
          >
            <span>All Calls</span>
          </Link>
          <span className='text-gray-400'>/</span>
          <div className='flex items-center gap-1 text-gray-500'>
            {!isLoading && call ? (
              <>
                <span className='font-medium'>{call.id || 'Call Details'}</span>
              </>
            ) : (
              <span>Call Details</span>
            )}
          </div>
        </div>
      </header>

      <div className='grid grid-cols-3 gap-6'>
        <div className='col-span-2 flex flex-col gap-6'>
          <TranscriptView />

          <AgentAnalysis />
        </div>

        <CallTimeline />
      </div>
    </div>
  );
}
