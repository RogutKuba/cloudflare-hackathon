'use client';

import { ChatMessage } from '@/components/call-view/ChatMessage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCall } from '@/query/call.query';

export function TranscriptView() {
  const { call, isLoading } = useCall();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const callTarget = call?.target || 'Unknown';
  const callStatus = call?.status || 'ended';
  const callDuration = call?.duration ? formatTime(call.duration) : '00:00';

  const messages = call?.transcript || [];

  return (
    <Card className='lg:col-span-1'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle>Call Transcript</CardTitle>
          <p className='text-sm text-muted-foreground'>Target: {callTarget}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge
            variant={callStatus === 'connected' ? 'success' : 'default'}
            className={
              callStatus === 'connected'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : ''
            }
          >
            {callStatus === 'connected'
              ? 'Connected'
              : callStatus === 'dialing'
              ? 'Dialing'
              : 'Ended'}
          </Badge>
          <span className='text-sm font-mono'>{callDuration}</span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Live Transcript - reduced height */}
        <div className='rounded-lg p-4 h-[250px] overflow-y-auto mb-4'>
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              sender={message.role === 'assistant' ? 'AI' : 'CS'}
              content={message.message}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
