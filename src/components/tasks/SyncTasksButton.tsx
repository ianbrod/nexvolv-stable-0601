'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { syncTasks } from '@/lib/sync-tasks';

interface SyncTasksButtonProps {
  serverTasks: any[];
}

export function SyncTasksButton({ serverTasks }: SyncTasksButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      console.log('Starting task synchronization...');
      console.log('Server tasks:', serverTasks);

      const result = await syncTasks(serverTasks);

      console.log('Tasks synchronized:', result);

      // Log results if there were actual changes
      if (result.added > 0 || result.updated > 0 || result.removed > 0) {
        console.log(`Tasks synchronized - Added: ${result.added}, Updated: ${result.updated}, Removed: ${result.removed}`);
      }
    } catch (error) {
      console.error('Error syncing tasks:', error);
      console.error('Synchronization failed - There was an error synchronizing tasks.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-1"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      <span>{isSyncing ? 'Syncing...' : 'Sync Tasks'}</span>
    </Button>
  );
}
