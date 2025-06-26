'use client';

import React, { useState } from 'react';
import PomodoroTimer from './PomodoroTimer';
import { Button } from '@/components/ui/button';

interface TaskItemProps {
  task: {
    id: string;
    name: string;
  };
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const [showTimer, setShowTimer] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const handlePomodoroComplete = () => {
    setPomodoroCount(pomodoroCount + 1);
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium">{task.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pomodoros: {pomodoroCount}</span>
          <Button 
            onClick={() => setShowTimer(!showTimer)}
            variant="outline"
            size="sm"
          >
            {showTimer ? 'Hide Timer' : 'Start Pomodoro'}
          </Button>
        </div>
      </div>
      {showTimer && (
        <div className="flex justify-center">
          <PomodoroTimer onComplete={handlePomodoroComplete} />
        </div>
      )}
    </div>
  );
};

export default TaskItem; 