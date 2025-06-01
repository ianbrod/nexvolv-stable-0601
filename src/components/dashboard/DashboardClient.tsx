'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarContainer } from '@/components/dashboard/CalendarContainer';
import { useReminders } from '@/contexts/ReminderContext';
import { getDashboardData } from '@/actions/getDashboardData';
import { Task, Goal } from '@/types';

function DashboardClient() {
  // Access reminders from context
  const { reminders } = useReminders();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tasks and goals on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await getDashboardData();

        if (result && result.tasks && result.goals) {
          setTasks(result.tasks as Task[]);
          setGoals(result.goals as Goal[]);
        } else {
          console.error('Invalid data structure returned from getDashboardData');
          // Set empty arrays to prevent null reference errors
          setTasks([]);
          setGoals([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty arrays to prevent null reference errors
        setTasks([]);
        setGoals([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading dashboard data...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarContainer
        tasks={tasks}
        goals={goals}
        reminders={reminders}
      />
    </div>
  );
}

export default React.memo(DashboardClient);
