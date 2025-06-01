'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { syncCategories } from '@/lib/sync-categories';

interface SyncCategoriesButtonProps {
  serverCategories: any[];
}

export const SyncCategoriesButton = React.memo(function SyncCategoriesButton({ serverCategories }: SyncCategoriesButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      console.log('Starting category synchronization...');
      console.log('Server categories:', serverCategories);

      const result = await syncCategories(serverCategories);

      console.log('Categories synchronized:', result);
      alert(`Categories synchronized! Added: ${result.added}, Updated: ${result.updated}, Removed: ${result.removed}`);
    } catch (error) {
      console.error('Error syncing categories:', error);
      alert('There was an error synchronizing categories.');
    } finally {
      setIsSyncing(false);
    }
  }, [serverCategories]);

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-1"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      <span>Sync Categories</span>
    </Button>
  );
});
