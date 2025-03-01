'use client';

import { useState, useEffect } from 'react';
import { TranscriptView, Message } from '@/components/call-view/TranscriptView';
import { AgentAnalysis } from '@/components/call-view/AgentAnalysis';
import { CallTimeline } from '@/components/call-view/CallTimeline';
import { TimelineScrubber } from '@/components/call-view/TimelineScrubber';
import { useCall } from '@/query/call.query';

export default function Home() {
  const [isListening, setIsListening] = useState(true);
  const [callStatus, setCallStatus] = useState<
    'connected' | 'ended' | 'dialing'
  >('connected');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const callDuration = 240; // 4 minutes in seconds

  // Auto-increment time when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && currentTime < callDuration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= callDuration) {
            setIsPlaying(false);
            return callDuration;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, callDuration]);

  // Sample data - in a real app, this would come from your state management
  const messages: Message[] = [
    {
      sender: 'AI',
      content:
        "Hello, I'm calling about my toaster that keeps making toast shaped like Elvis. It's very concerning.",
    },
    {
      sender: 'CS',
      content:
        "I'm sorry to hear about that issue, sir. Can you please provide your order number?",
    },
    {
      sender: 'AI',
      content:
        "I don't have an order number. The toaster just showed up one day. I think it's haunted.",
    },
    {
      sender: 'CS',
      content:
        "I see... Well, we don't actually sell haunted toasters. Are you sure you purchased this from our company?",
    },
  ];

  const metrics = [
    { name: 'Politeness Score', value: '4.2/5', percentage: 84 },
    { name: 'Deflection Rating', value: 'Medium', percentage: 50 },
    { name: 'Frustration Level', value: 'Low', percentage: 25 },
  ];

  const redFlags = [
    { description: 'Attempted to transfer call', timestamp: '01:24' },
    { description: 'Sighed audibly', timestamp: '02:37' },
  ];

  const recordings = [
    {
      id: 1,
      company: 'TechSupport Inc.',
      date: 'April 11, 2023',
      time: '4:31 PM',
      status: 'hung-up' as const,
      onPlay: () => console.log('Play recording 1'),
    },
    {
      id: 2,
      company: 'TechSupport Inc.',
      date: 'April 12, 2023',
      time: '4:32 PM',
      status: 'transferred' as const,
      onPlay: () => console.log('Play recording 2'),
    },
    {
      id: 3,
      company: 'TechSupport Inc.',
      date: 'April 13, 2023',
      time: '4:33 PM',
      status: 'completed' as const,
      onPlay: () => console.log('Play recording 3'),
    },
  ];

  const summaries = [
    {
      id: 1,
      company: 'TechSupport Inc.',
      summary:
        'AI claimed to have a computer that was "possessed by the ghost of Steve Jobs." Agent initially tried to troubleshoot before realizing it was a prank. Agent became frustrated after 3 minutes and hung up.',
    },
    {
      id: 2,
      company: 'TechSupport Inc.',
      summary:
        'AI reported internet speeds "slower than a turtle walking through peanut butter." Agent remained professional but transferred call to supervisor after AI insisted the problem was caused by "moon phases."',
    },
  ];

  const timelineEvents = [
    {
      timestamp: '00:12',
      description: 'Call connected',
      type: 'success' as const,
    },
    {
      timestamp: '00:45',
      description: 'Agent asked for order number',
      type: 'info' as const,
    },
    {
      timestamp: '01:24',
      description: 'Agent attempted to transfer call',
      type: 'warning' as const,
    },
    {
      timestamp: '02:37',
      description: 'Agent sighed audibly',
      type: 'warning' as const,
    },
    {
      timestamp: '03:15',
      description: 'Agent offered troubleshooting steps',
      type: 'info' as const,
    },
  ];

  const handleToggleAudio = () => {
    setIsListening(!isListening);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
  };

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // Format the current time for display
  const formatCallDuration = () => {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const { call, isLoading, error } = useCall();

  console.log({ call });

  return (
    <div className='bg-background text-foreground min-h-screen p-6'>
      <header className='mb-6'>
        <h1 className='text-3xl font-bold'>🤖 PrankAI Call Dashboard</h1>
        <p>Real-time monitoring of AI customer service prank calls</p>
      </header>

      <div className='grid grid-cols-3 gap-6'>
        <div className='col-span-2 flex flex-col gap-6'>
          <TranscriptView
            callTarget='Acme Customer Support'
            callStatus={callStatus}
            callDuration={formatCallDuration()}
            messages={messages}
            onEndCall={handleEndCall}
            onToggleAudio={handleToggleAudio}
            isListening={isListening}
            currentTime={currentTime}
            duration={callDuration}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
          />

          <AgentAnalysis metrics={metrics} redFlags={redFlags} />
        </div>

        <CallTimeline events={timelineEvents} />
      </div>
    </div>
  );
}
