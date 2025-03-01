import { useCrawledPages } from '@/query/page.query';
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeaderCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiLoader2Fill,
} from '@remixicon/react';
import { DialogDescription } from '@/components/ui/dialog';
import { DialogTitle } from '@/components/ui/dialog';
import { DialogHeader } from '@/components/ui/dialog';

export const StageTwo = (props: { callId: string; onSubmit: () => void }) => {
  const { callId, onSubmit } = props;
  const { pages, isLoading } = useCrawledPages({ callId: callId });

  // Sort pages: queued first, then others (completed at bottom)
  const sortedPages = [...(pages || [])].sort((a, b) => {
    if (a.status === 'queued' && b.status !== 'queued') return -1;
    if (a.status !== 'queued' && b.status === 'queued') return 1;
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return 0;
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Crawled Pages</DialogTitle>
        <DialogDescription>Review crawled pages</DialogDescription>
      </DialogHeader>
      <div className='flex flex-col gap-4 h-full'>
        <div className='overflow-auto flex-1 max-h-[60vh]'>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>URL</TableHeaderCell>
                <TableHeaderCell className='text-right'>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className='text-left'>{page.url}</TableCell>
                  <TableCell className='flex justify-end'>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        page.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : page.status === 'queued'
                          ? 'bg-blue-100 text-blue-800'
                          : page.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {page.status === 'completed' ? (
                        <RiCheckLine className='w-3 h-3 mr-1 text-green-500' />
                      ) : page.status === 'queued' ? (
                        <RiLoader2Fill className='w-3 h-3 mr-1 animate-spin' />
                      ) : (
                        <RiErrorWarningLine className='w-3 h-3 mr-1 text-red-500' />
                      )}
                      {page.status.charAt(0).toUpperCase() +
                        page.status.slice(1)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className='flex justify-end'>
          <Button onClick={onSubmit}>Next</Button>
        </div>
      </div>
    </>
  );
};
