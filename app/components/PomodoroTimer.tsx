'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PomodoroTimerProps {
  onComplete?: () => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onComplete }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (minutes === 0 && seconds === 0) {
      if (onComplete) {
        onComplete();
      }
      setIsActive(false);
    }

    const timer =
      isActive && (minutes > 0 || seconds > 0)
        ? setInterval(() => {
            if (seconds === 0) {
              setMinutes(minutes - 1);
              setSeconds(59);
            } else {
              setSeconds(seconds - 1);
            }
          }, 1000)
        : null;

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [minutes, seconds, isActive, onComplete]);

  const startTimer = () => setIsActive(true);
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-center">Pomodoro Timer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-primary">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={startTimer} disabled={isActive} variant="default" size="sm">
            Start
          </Button>
          <Button onClick={pauseTimer} disabled={!isActive} variant="secondary" size="sm">
            Pause
          </Button>
          <Button onClick={resetTimer} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer; 