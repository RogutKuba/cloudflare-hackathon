'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCalls } from '@/query/call.query';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { CreateCallDialog } from '@/components/CreateCallDialog';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { calls, isLoading, error } = useCalls();

  const router = useRouter();

  const handleCallClick = (callId: string) => {
    router.push(`/call/${callId}`);
  };

  return (
    <div className='bg-background text-foreground min-h-screen p-6'>
      <header className='mb-6 flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>ServiceCheck</h1>
          <p className='text-gray-500 mb-0'>
            Test and evaluate your customer service with AI-powered calls
          </p>
        </div>
        <CreateCallDialog>
          <Button>Create Call</Button>
        </CreateCallDialog>
      </header>

      {error ? (
        <div className='text-red-500 p-4 border border-red-300 rounded-md'>
          Error loading calls: {error.message}
        </div>
      ) : (
        <TableRoot>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className='w-1/6'>ID</TableHeaderCell>
                <TableHeaderCell className='w-1/3'>Date & Time</TableHeaderCell>
                <TableHeaderCell className='w-1/6'>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calls && calls.length > 0 ? (
                calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className='hover:bg-muted/50 cursor-pointer transition-colors'
                    onClick={() => handleCallClick(call.id)}
                  >
                    <TableCell className='font-mono text-sm'>
                      {call.id}
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col'>
                        <span className='text-sm'>
                          Started: {call.startedAt.toLocaleString()}
                        </span>
                        {call.endedAt && (
                          <span className='text-sm text-gray-500'>
                            Ended: {call.endedAt.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          call.status === 'completed'
                            ? 'success'
                            : call.status === 'in-progress'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {call.status.charAt(0).toUpperCase() +
                          call.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-center py-8 text-gray-500'
                  >
                    No calls available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableRoot>
      )}
    </div>
  );
}
