'use client';

import React, { useState, useEffect } from 'react';
import { HierarchicalCaptainsLogList } from './HierarchicalCaptainsLogList';
import { CaptainsLogDetailSimple } from './CaptainsLogDetailSimple';
import { RecordingModal } from './RecordingModal';
import { UploadModal } from './UploadModal';
import { LogEntry } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getGoalsAndTasks } from '@/actions/getGoalsAndTasks';
import { hierarchicalLogEntryStorage } from '@/lib/storage/hierarchical-log-entry-storage';
import { showDatabaseErrorDialog } from '@/lib/utils/database-reset';
import { DatabaseResetButton } from '@/components/debug/DatabaseResetButton';
import { deduplicateEntries } from '@/lib/utils/entry-deduplication';
import { triggerRecording, triggerUpload } from '@/lib/events/recording-events';




/**
 * Tag-based implementation of the Captain's Log client wrapper
 */
export default function TagBasedCaptainsLogClientWrapper() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [selectedEntryEditMode, setSelectedEntryEditMode] = useState<'title' | 'summary' | 'transcription' | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);



  const [hasConstraintError, setHasConstraintError] = useState(false);

  // Load data on component mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        // Load entries and goals concurrently
        const [entries, goalsData] = await Promise.all([
          hierarchicalLogEntryStorage.getAllEntries(),
          getGoalsAndTasks()
        ]);

        // Process entries
        const uniqueEntries = deduplicateEntries(entries);
        setLogEntries(uniqueEntries);

        // Process goals
        if (goalsData.success) {
          setGoals(goalsData.goals);
          console.log(`Loaded ${goalsData.goals.length} goals`);
        } else {
          console.error('Failed to load goals:', goalsData.error);
        }

        console.log(`Loaded ${entries.length} entries`);
      } catch (error) {
        console.error('Error loading data:', error);

        // Check if this is a database version error
        if (error instanceof Error && (
          error.message.includes('VersionError') ||
          error.message.includes('version') ||
          error.name === 'DatabaseClosedError'
        )) {
          console.log('Database version error detected, showing reset dialog');
          showDatabaseErrorDialog();
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Real-time updates: Refresh data when associations change
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    // Set up periodic refresh to catch association changes
    const startRealTimeUpdates = () => {
      refreshInterval = setInterval(async () => {
        try {
          // Refresh log entries to pick up association changes
          const updatedEntries = await hierarchicalLogEntryStorage.getAllEntries();
          const uniqueEntries = deduplicateEntries(updatedEntries);
          setLogEntries(uniqueEntries);

          console.log('Real-time update: Refreshed log entries');
        } catch (error) {
          console.error('Error during real-time update:', error);
        }
      }, 5000); // Refresh every 5 seconds
    };

    // Start real-time updates
    startRealTimeUpdates();

    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Listen for custom events that indicate data changes
  useEffect(() => {
    const handleDataChange = async () => {
      try {
        console.log('Data change event detected, refreshing entries...');
        const updatedEntries = await hierarchicalLogEntryStorage.getAllEntries();
        const uniqueEntries = deduplicateEntries(updatedEntries);
        setLogEntries(uniqueEntries);
      } catch (error) {
        console.error('Error refreshing data after change event:', error);
      }
    };

    // Listen for custom events
    window.addEventListener('captainslog-data-changed', handleDataChange);
    window.addEventListener('prisma-data-changed', handleDataChange);

    return () => {
      window.removeEventListener('captainslog-data-changed', handleDataChange);
      window.removeEventListener('prisma-data-changed', handleDataChange);
    };
  }, []);



  // Handle entry selection
  const handleEntrySelect = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setSelectedEntryEditMode(undefined); // Clear edit mode for normal selection
  };

  // Handle entry selection with edit mode
  const handleEntrySelectWithEdit = (entry: LogEntry, editMode: 'title' | 'summary' | 'transcription') => {
    setSelectedEntry(entry);
    setSelectedEntryEditMode(editMode);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedEntry(null);
    setSelectedEntryEditMode(undefined);
  };

  // Handle toggling recording mode - triggers global event
  const handleToggleRecording = () => {
    triggerRecording();
  };

  // Handle toggling upload mode - triggers global event
  const handleToggleUpload = () => {
    triggerUpload();
  };

  // Handle new entry creation and updates
  const handleNewEntry = async (entry: LogEntry) => {
    try {
      // Note: Modal components will handle closing themselves after successful save
      // No need to manually set recording/uploading state here

      // Check if this entry already exists in our state
      const existingEntryIndex = logEntries.findIndex(e => e.id === entry.id);

      if (existingEntryIndex >= 0) {
        // Entry exists - update it
        console.log('Updating existing entry:', entry.id, 'with status:', entry.processingStatus);
        await hierarchicalLogEntryStorage.updateEntry(entry);

        // Update in state with deduplication
        setLogEntries(prevEntries => {
          const updated = prevEntries.map(e => e.id === entry.id ? entry : e);
          return deduplicateEntries(updated);
        });
      } else {
        // New entry - create it
        console.log('Creating new entry:', entry.id, 'with status:', entry.processingStatus);
        await hierarchicalLogEntryStorage.createEntry(entry);

        // Add to state with deduplication
        setLogEntries(prevEntries => deduplicateEntries([entry, ...prevEntries]));
      }

      // Never auto-select entries from modal flows
      // Keep users on the main list view regardless of processing status
      // Users can manually click on entries if they want to view them

    } catch (error) {
      console.error('Error saving entry:', error);

      // Check for constraint error
      if (error instanceof Error && error.message.includes('Key already exists')) {
        setHasConstraintError(true);
      } else {
        // Don't show alert immediately - the entry is still visible in the UI
        console.warn('Entry may not be persisted but is visible in UI. User can try saving again.');
      }
    }
  };

  // Handle entry update
  const handleUpdateEntry = async (updatedEntry: LogEntry) => {
    try {
      // Update the entry
      await hierarchicalLogEntryStorage.updateEntry(updatedEntry);

      // Update in state with deduplication
      setLogEntries(prevEntries => {
        const updated = prevEntries.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry);
        return deduplicateEntries(updated);
      });

      // Update selected entry if it's the one being updated
      if (selectedEntry && selectedEntry.id === updatedEntry.id) {
        setSelectedEntry(updatedEntry);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert(`Error updating entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle entry deletion
  const handleDeleteEntry = async (entryId: string) => {
    try {
      // Delete the entry
      await hierarchicalLogEntryStorage.deleteEntry(entryId);

      // Remove from state
      setLogEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));

      // Clear selected entry if it's the one being deleted
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert(`Error deleting entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle toggling favorite status
  const handleToggleFavorite = async (entryId: string) => {
    try {
      // Find the entry
      const entry = logEntries.find(entry => entry.id === entryId);
      if (!entry) {
        throw new Error(`Entry with ID ${entryId} not found`);
      }

      // Toggle favorite status
      const updatedEntry = {
        ...entry,
        isFavorite: !entry.isFavorite,
        updatedAt: new Date()
      };

      // Update the entry
      await hierarchicalLogEntryStorage.updateEntry(updatedEntry);

      // Update in state with deduplication
      setLogEntries(prevEntries => {
        const updated = prevEntries.map(entry => entry.id === entryId ? updatedEntry : entry);
        return deduplicateEntries(updated);
      });

      // Update selected entry if it's the one being updated
      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry(updatedEntry);
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      alert(`Error toggling favorite: ${error instanceof Error ? error.message : String(error)}`);
    }
  };





  if (isLoading) {
    return <CaptainsLogSkeleton />;
  }

  return (
    <div className="h-full flex flex-col">
      {hasConstraintError && <DatabaseResetButton />}
      {selectedEntry ? (
        <CaptainsLogDetailSimple
          entry={selectedEntry}
          onBack={handleBackToList}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
          initialEditMode={selectedEntryEditMode}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          <HierarchicalCaptainsLogList
            entries={logEntries}
            onSelectEntry={handleEntrySelect}
            onSelectEntryWithEdit={handleEntrySelectWithEdit}
            onNewRecording={handleToggleRecording}
            onUploadAudio={handleToggleUpload}
            onToggleFavorite={handleToggleFavorite}
            onDeleteEntry={handleDeleteEntry}
            goals={goals}
          />

          {/* Recording and Upload modals are now handled globally */}
        </div>
      )}
    </div>
  );
}

function CaptainsLogSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
