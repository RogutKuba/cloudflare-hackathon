'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  RiPlayFill,
  RiPauseFill,
  RiSkipBackFill,
  RiSkipForwardFill,
} from '@remixicon/react';

interface TimelineScrubberProps {
  duration: number; // Total duration in seconds
  currentTime: number; // Current position in seconds
  onTimeChange: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
}

export function TimelineScrubber({
  duration,
  currentTime,
  onTimeChange,
  onPlay,
  onPause,
  isPlaying,
}: TimelineScrubberProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 15));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 15));
  };

  return (
    <Card className='mt-4'>
      <CardHeader className='flex flex-row items-center justify-between py-2'>
        <CardTitle className='text-sm'>Call Timeline</CardTitle>
        <div className='text-sm font-mono'>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </CardHeader>
      <CardContent className='py-2'>
        <div className='space-y-4'>
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={(value) => onTimeChange(value[0])}
            className='w-full'
          />

          <div className='flex justify-center space-x-2'>
            <Button onClick={handleSkipBack}>
              <RiSkipBackFill className='h-4 w-4' />
              <span className='ml-1'>15s</span>
            </Button>

            <Button onClick={isPlaying ? onPause : onPlay} className='w-20'>
              {isPlaying ? (
                <>
                  <RiPauseFill className='h-4 w-4 mr-1' /> Pause
                </>
              ) : (
                <>
                  <RiPlayFill className='h-4 w-4 mr-1' /> Play
                </>
              )}
            </Button>

            <Button onClick={handleSkipForward}>
              <span className='mr-1'>15s</span>
              <RiSkipForwardFill className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
