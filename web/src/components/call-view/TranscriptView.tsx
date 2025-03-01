'use client';

import { ChatMessage } from '@/components/call-view/ChatMessage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  RiVolumeUpLine,
  RiPhoneLockLine,
  RiPlayFill,
  RiPauseFill,
} from '@remixicon/react';

export interface Message {
  sender: 'AI' | 'CS';
  content: string;
  timestamp?: string;
}

interface TranscriptViewProps {
  callTarget: string;
  callStatus: 'connected' | 'ended' | 'dialing';
  callDuration: string;
  messages: Message[];
  onEndCall: () => void;
  onToggleAudio: () => void;
  isListening: boolean;
  currentTime: number;
  duration: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export function TranscriptView({
  callTarget,
  callStatus,
  callDuration,
  messages,
  onEndCall,
  onToggleAudio,
  isListening,
  currentTime,
  duration,
  onTimeChange,
  isPlaying,
  onPlay,
  onPause,
}: TranscriptViewProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

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
              sender={message.sender}
              content={message.content}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
