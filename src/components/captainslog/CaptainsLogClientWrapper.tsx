'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CaptainsLogList } from './CaptainsLogList';
import { CaptainsLogDetailSimple } from './CaptainsLogDetailSimple';
import { RecordingModal } from './RecordingModal';
import { UploadModal } from './UploadModal';
import { LogEntry, Category, Goal } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, generateSystemFolders, mergeFolders, isSystemFolder } from './AutoFolders';
import { getCategoriesForCaptainsLog, getGoalsForCategory } from '@/actions/captainslog-categories';
import { CaptainsLogStorage } from '@/lib/storage/captains-log-storage';
import { getCustomFolders, createCustomFolder, updateCustomFolder, deleteCustomFolder } from '@/actions/custom-folders';
import { MigrationUtility } from '@/lib/storage/migration-utility';
import { resetCaptainsLogDatabase, fixFolderAssignments } from '@/lib/storage/captains-log-database';
import { singleFolderAssociationService } from '@/lib/services/single-folder-association-service';

import { autoMigrateIfNeeded } from '@/lib/utils/audio-url-migration';
import { triggerRecording, triggerUpload } from '@/lib/events/recording-events';

// No fallback mock data - we'll only use real data from the database

export default function CaptainsLogClientWrapper() {
  const searchParams = useSearchParams() || new URLSearchParams();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isResetting, setIsResetting] = useState(false);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [systemFolders, setSystemFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);

  // State for real categories and goals
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  // Fetch state (not currently displayed in UI)
  const [, setIsFetchingCategories] = useState(false);
  const [, setCategoryError] = useState<string | null>(null);

  // State for version error detection
  const [hasVersionError, setHasVersionError] = useState(false);

  // Function to check if an error is related to database version
  const isVersionError = (error: any): boolean => {
    if (!error) return false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isVersion = errorMessage.includes('version') ||
                      errorMessage.includes('VersionError') ||
                      errorMessage.includes('different version');

    // Set the version error state if detected
    if (isVersion) {
      setHasVersionError(true);
    }

    return isVersion;
  };

  // Function to fetch categories from the database
  const fetchCategories = async () => {
    try {
      setIsFetchingCategories(true);
      setCategoryError(null);

      const result = await getCategoriesForCaptainsLog();

      if (result.success && result.data) {
        console.log('[DEBUG] fetchCategories: Successfully fetched categories:', result.data);
        setCategories(result.data);
      } else {
        console.error('[DEBUG] fetchCategories: Failed to fetch categories:', result.error);
        setCategoryError(result.error || 'Failed to fetch categories');
        // Keep using the current categories (or fallback if none)
      }
    } catch (error) {
      console.error('[DEBUG] fetchCategories: Error fetching categories:', error);
      setCategoryError('An unexpected error occurred while fetching categories');
    } finally {
      setIsFetchingCategories(false);
    }
  };

  // Function to fetch goals for a specific category
  const fetchGoalsForCategory = async (categoryId: string) => {
    try {
      const result = await getGoalsForCategory(categoryId);

      if (result.success && result.data) {
        console.log(`[DEBUG] fetchGoalsForCategory: Successfully fetched goals for category ${categoryId}:`, result.data);
        // Update goals state with the fetched goals
        // For now, we'll just append them to the existing goals
        setGoals(prevGoals => {
          // Filter out any goals that already exist for this category
          const filteredGoals = prevGoals.filter(goal => goal.category !== categoryId);
          // Add the new goals
          return [...filteredGoals, ...(result.data || [])];
        });
      } else {
        console.error(`[DEBUG] fetchGoalsForCategory: Failed to fetch goals for category ${categoryId}:`, result.error);
      }
    } catch (error) {
      console.error(`[DEBUG] fetchGoalsForCategory: Error fetching goals for category ${categoryId}:`, error);
    }
  };

  // Load custom folders from Prisma database
  useEffect(() => {
    const loadCustomFolders = async () => {
      try {
        console.log('Loading custom folders from Prisma database...');
        const customFolders = await getCustomFolders();

        if (customFolders.length > 0) {
          // Convert CustomFolder to Folder interface
          const userFoldersFromDB = customFolders.map(folder => ({
            id: folder.id,
            name: folder.name,
            color: folder.color,
            isSystem: false // Custom folders are never system folders
          }));

          setUserFolders(userFoldersFromDB);
          console.log('Loaded custom folders from Prisma:', userFoldersFromDB.length);
        } else {
          console.log('No custom folders found in Prisma, starting with empty custom folders');
          setUserFolders([]);
        }
      } catch (error) {
        console.error('Error loading custom folders from Prisma:', error);
        setUserFolders([]);
      }
    };

    loadCustomFolders();
  }, []);

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
    // We'll fetch goals for each category after we have the categories
  }, []); // Empty dependency array means this runs once on mount

  // Fetch goals for each category when categories change
  useEffect(() => {
    // Only proceed if we have categories
    if (categories.length > 0) {
      console.log('[DEBUG] Fetching goals for categories:', categories);

      // Fetch goals for each category
      categories.forEach(category => {
        fetchGoalsForCategory(category.id);
      });
    }
  }, [categories]); // Re-run when categories change

  // Generate system folders from categories and goals
  useEffect(() => {
    console.log('[DEBUG] System Folder Generation useEffect START');
    console.log('[DEBUG] Input categories:', categories);
    console.log('[DEBUG] Input goals:', goals);

    // Generate folders from the real categories and goals
    const generatedFolders = generateSystemFolders(categories, goals);
    console.log('[DEBUG] Output generatedFolders:', generatedFolders);
    setSystemFolders(generatedFolders);
  }, [categories, goals]); // Re-generate when categories or goals change

  // Merge user and system folders
  useEffect(() => {
    console.log('[DEBUG] Folder Merging useEffect START');
    console.log('[DEBUG] Input systemFolders:', systemFolders);
    console.log('[DEBUG] Input userFolders:', userFolders);
    const merged = mergeFolders(systemFolders, userFolders);
    console.log('[DEBUG] Output merged (allFolders):', merged);
    setAllFolders(merged);
  }, [systemFolders, userFolders]);

  // Effect to check for deleted goals/categories and update records
  useEffect(() => {
    if (isLoading || !goals || !logEntries.length) return;

    // Create a map of valid folder IDs (both category and goal folders)
    const validFolderIds = new Set([
      ...allFolders.map(folder => folder.id),
      ...goals.map(goal => `goal:${goal.id}`)
    ]);

    // Check if any entries have invalid folder IDs
    let hasInvalidFolders = false;
    const updatedEntries = logEntries.map(entry => {
      // Skip entries without folder assignment
      if (!entry.folderId) return entry;

      // If the folder ID is not valid, reset it to undefined (uncategorized)
      if (!validFolderIds.has(entry.folderId)) {
        hasInvalidFolders = true;
        console.log(`Moving record ${entry.id} to uncategorized because its folder ${entry.folderId} no longer exists`);
        return { ...entry, folderId: undefined };
      }

      return entry;
    });

    // If we found invalid folders, update the entries
    if (hasInvalidFolders) {
      setLogEntries(updatedEntries);

      // Save to localStorage for backward compatibility
      try {
        localStorage.setItem('captainsLogEntries', JSON.stringify(updatedEntries));
        console.log('Updated entries with invalid folders to uncategorized');

        // Also update in IndexedDB - using a separate async function to avoid await in useEffect
        const updateEntries = async () => {
          try {
            for (const entry of updatedEntries.filter(e => e.folderId === undefined && logEntries.find(le => le.id === e.id)?.folderId !== undefined)) {
              await CaptainsLogStorage.saveLogEntry(entry);
            }
          } catch (error) {
            console.error('Error updating entries in IndexedDB:', error);
          }
        };

        updateEntries();
      } catch (error) {
        console.error('Error saving updated entries:', error);
      }
    }
  }, [isLoading, goals, logEntries, allFolders]);

  // Function to verify folder assignments (now uses Prisma for custom folders)
  const verifyFolderAssignments = async (entries: LogEntry[]): Promise<LogEntry[]> => {
    console.log('Verifying folder assignments for', entries.length, 'entries');

    // Check if any entries have folder assignments
    const entriesWithFolders = entries.filter(entry => entry.folderId !== undefined);
    console.log('Entries with folder assignments:', entriesWithFolders.length);

    if (entriesWithFolders.length > 0) {
      console.log('Sample folder assignments:');
      entriesWithFolders.slice(0, 3).forEach(entry => {
        console.log(`Entry ${entry.id}: folderId=${entry.folderId}`);
      });
    }

    // Get valid folder IDs from both system and custom folders
    const customFolders = await getCustomFolders();
    console.log('Available custom folders:', customFolders.length);

    // Create set of valid folder IDs (system folders + custom folders)
    const validFolderIds = new Set([
      ...allFolders.map(folder => folder.id), // System folders
      ...customFolders.map(folder => folder.id) // Custom folders
    ]);

    console.log('Total valid folder IDs:', validFolderIds.size);

    const entriesWithInvalidFolders = entriesWithFolders.filter(
      entry => !validFolderIds.has(entry.folderId as string)
    );

    console.log('Entries with invalid folder IDs:', entriesWithInvalidFolders.length);

    if (entriesWithInvalidFolders.length > 0) {
      console.log('Fixing invalid folder assignments...');

      // Create updated entries with fixed folder IDs
      const updatedEntries = entries.map(entry => {
        if (entry.folderId && !validFolderIds.has(entry.folderId)) {
          console.log(`Fixing entry ${entry.id}: invalid folderId=${entry.folderId}`);
          return { ...entry, folderId: undefined };
        }
        return entry;
      });

      // Save the fixed entries
      for (const entry of entriesWithInvalidFolders) {
        try {
          const fixedEntry = { ...entry, folderId: undefined };
          await CaptainsLogStorage.saveLogEntry(fixedEntry);
          console.log(`Fixed entry ${entry.id} by removing invalid folderId=${entry.folderId}`);
        } catch (error) {
          console.error(`Error fixing entry ${entry.id}:`, error);
        }
      }

      return updatedEntries;
    }

    return entries;
  };

  // Function to load folder assignments from localStorage
  const loadFolderAssignmentsFromLocalStorage = (entries: LogEntry[]): LogEntry[] => {
    console.log('Checking localStorage for folder assignments');

    try {
      const localStorageEntries = localStorage.getItem('captainsLogEntries');
      if (!localStorageEntries) {
        console.log('No entries found in localStorage');
        return entries;
      }

      const parsedEntries = JSON.parse(localStorageEntries);
      if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
        console.log('No valid entries found in localStorage');
        return entries;
      }

      console.log(`Found ${parsedEntries.length} entries in localStorage`);

      // Check for folder assignments in localStorage
      const lsEntriesWithFolders = parsedEntries.filter(entry => entry.folderId !== undefined);
      console.log(`${lsEntriesWithFolders.length} localStorage entries have folder assignments`);

      if (lsEntriesWithFolders.length === 0) {
        console.log('No folder assignments found in localStorage');
        return entries;
      }

      // Create a map of entry IDs to folder IDs from localStorage
      const folderMap = new Map<string, string>();
      lsEntriesWithFolders.forEach(entry => {
        if (entry.id && entry.folderId) {
          folderMap.set(entry.id, entry.folderId);
        }
      });

      console.log(`Created folder map with ${folderMap.size} entries`);

      // Update entries with folder assignments from localStorage
      const updatedEntries = entries.map(entry => {
        const lsFolderId = folderMap.get(entry.id);
        if (lsFolderId && (!entry.folderId || entry.folderId !== lsFolderId)) {
          console.log(`Updating entry ${entry.id} with folderId ${lsFolderId} from localStorage`);
          return { ...entry, folderId: lsFolderId };
        }
        return entry;
      });

      // Count entries with folder assignments after update
      const updatedEntriesWithFolders = updatedEntries.filter(entry => entry.folderId !== undefined);
      console.log(`${updatedEntriesWithFolders.length} entries have folder assignments after update`);

      return updatedEntries;
    } catch (error) {
      console.error('Error loading folder assignments from localStorage:', error);
      return entries;
    }
  };

  // Load log entries from IndexedDB or migrate from localStorage
  useEffect(() => {
    const loadLogEntries = async () => {
      try {
        setIsLoading(true);

        // Fix folder assignments in the database
        try {
          console.log('Calling fixFolderAssignments to ensure folder assignments persist...');
          await fixFolderAssignments();
          console.log('Finished fixing folder assignments');
        } catch (fixError) {
          console.error('Error fixing folder assignments:', fixError);
        }

        // Auto-migrate broken audio URLs
        try {
          console.log('Running audio URL migration...');
          await autoMigrateIfNeeded();
          console.log('Audio URL migration complete');
        } catch (migrationError) {
          console.error('Error during audio URL migration:', migrationError);
          // Don't fail the entire load process for this
        }

        // Check if migration is needed
        try {
          const migrationNeeded = await MigrationUtility.isMigrationNeeded();

          if (migrationNeeded) {
            console.log('Migration from localStorage to IndexedDB is needed');
            const migrationSuccess = await MigrationUtility.migrateFromLocalStorage();
            console.log('Migration result:', migrationSuccess ? 'Success' : 'Failed');
          }
        } catch (migrationError) {
          console.error('Error checking migration:', migrationError);

          // Check if it's a version error
          if (isVersionError(migrationError)) {
            console.warn('Version error detected during migration check');
            // Don't return yet, try to continue with loading entries
          }
        }

        // Get entries from IndexedDB (excluding archived entries)
        try {
          const entries = await CaptainsLogStorage.getAllLogEntries();

          if (entries.length > 0) {
            console.log('Loaded entries from IndexedDB:', entries.length);

            // Verify folder assignments
            let verifiedEntries = await verifyFolderAssignments(entries);

            // Load folder assignments from localStorage
            verifiedEntries = loadFolderAssignmentsFromLocalStorage(verifiedEntries);

            // Save entries with updated folder assignments back to IndexedDB
            for (const entry of verifiedEntries) {
              if (entry.folderId) {
                try {
                  await CaptainsLogStorage.assignEntryToFolder(entry.id, entry.folderId);
                  console.log(`Saved folder assignment for entry ${entry.id} to IndexedDB`);
                } catch (saveError) {
                  console.error(`Error saving folder assignment for entry ${entry.id}:`, saveError);
                }
              }
            }

            setLogEntries(verifiedEntries);
          } else {
            // If no entries were found, just set an empty array
            console.log('No entries found in IndexedDB, starting with empty state');
            setLogEntries([]);
          }
        } catch (loadError) {
          console.error('Error loading entries:', loadError);

          // Check if it's a version error
          if (isVersionError(loadError)) {
            console.warn('Version error detected when loading entries');
          }

          // Set empty entries array
          setLogEntries([]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error in loadLogEntries:', error);
        // If there's an error, just set an empty array
        console.log('Error occurred, starting with empty state');
        setLogEntries([]);
        setIsLoading(false);

        // Check if it's a version error
        if (isVersionError(error)) {
          console.warn('Version error detected in loadLogEntries');
        }
      }
    };

    loadLogEntries();
  }, []);

  // Check URL parameters for recording mode
  useEffect(() => {
    const recordParam = searchParams.get('record');
    if (recordParam === 'true') {
      // Trigger global recording modal instead of local state
      // Note: This functionality is now handled by the global recording provider
      console.log('Recording parameter detected in URL - global recording provider will handle this');
    }
  }, [searchParams]);





  // Handle entry selection
  const handleEntrySelect = (entry: LogEntry) => {
    setSelectedEntry(entry);
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedEntry(null);
  };

  // Handle recording toggle - triggers global event
  const handleToggleRecording = () => {
    triggerRecording();
  };

  // Handle upload toggle - triggers global event
  const handleToggleUpload = () => {
    triggerUpload();
  };

  // Handle new entry creation
  const handleNewEntry = async (entry: LogEntry) => {
    console.log('New entry received:', entry);

    // Ensure the entry has all required fields
    const validatedEntry: LogEntry = {
      ...entry,
      summary: entry.summary || '',
      duration: typeof entry.duration === 'number' && !isNaN(entry.duration) ? entry.duration : 60,
      segments: Array.isArray(entry.segments) ? entry.segments : [],
      srtData: entry.srtData || ''
    };

    // IMMEDIATELY update UI state to transition away from recording screen
    // This ensures the UI doesn't get stuck even if the save operation fails
    setIsRecording(false);
    setIsUploading(false);

    // Add the new entry to the list
    const updatedEntries = [validatedEntry, ...logEntries];
    setLogEntries(updatedEntries);

    // Never auto-select entries from modal flows
    // Keep users on the main list view regardless of processing status
    // Users can manually click on entries if they want to view them

    // Save to IndexedDB (this happens in the background)
    // If this fails, the entry is still in the UI and the user can try again
    try {
      await CaptainsLogStorage.saveLogEntry(validatedEntry);
      console.log('Saved entry to IndexedDB with ID:', validatedEntry.id);
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      // Don't show an alert immediately - the entry is still visible in the UI
      // Instead, log the error and the user can try to save again if needed
      console.warn('Entry is visible in UI but may not be persisted. User can try saving again.');
    }
  };

  // Handle entry update
  const handleUpdateEntry = async (updatedEntry: LogEntry) => {
    // Ensure the updated entry has all required fields
    const validatedEntry: LogEntry = {
      ...updatedEntry,
      summary: updatedEntry.summary || '',
      duration: typeof updatedEntry.duration === 'number' && !isNaN(updatedEntry.duration) ? updatedEntry.duration : 60,
      segments: Array.isArray(updatedEntry.segments) ? updatedEntry.segments : [],
      srtData: updatedEntry.srtData || ''
    };

    const updatedEntries = logEntries.map(entry =>
      entry.id === validatedEntry.id ? validatedEntry : entry
    );
    setLogEntries(updatedEntries);
    setSelectedEntry(validatedEntry);

    // Save to IndexedDB
    try {
      await CaptainsLogStorage.saveLogEntry(validatedEntry);
      console.log('Updated entry in IndexedDB with ID:', validatedEntry.id);
    } catch (error) {
      console.error('Error updating entry in IndexedDB:', error);
      alert(`Error updating entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle entry deletion
  const handleDeleteEntry = async (entryId: string) => {
    const updatedEntries = logEntries.filter(entry => entry.id !== entryId);
    setLogEntries(updatedEntries);
    if (selectedEntry && selectedEntry.id === entryId) {
      setSelectedEntry(null);
    }

    // Delete from IndexedDB
    try {
      await CaptainsLogStorage.deleteEntry(entryId);
      console.log('Deleted entry from IndexedDB with ID:', entryId);
    } catch (error) {
      console.error('Error deleting entry from IndexedDB:', error);
      alert(`Error deleting entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  };



  // Handle toggling favorite status
  const handleToggleFavorite = async (entryId: string) => {
    const entryToUpdate = logEntries.find(entry => entry.id === entryId);
    if (!entryToUpdate) {
      console.error(`Entry with ID ${entryId} not found for toggling favorite`);
      return;
    }

    // Toggle favorite status
    const updatedEntry = {
      ...entryToUpdate,
      isFavorite: !entryToUpdate.isFavorite,
      updatedAt: new Date()
    };

    // Update in state
    const updatedEntries = logEntries.map(entry =>
      entry.id === entryId ? updatedEntry : entry
    );
    setLogEntries(updatedEntries);

    if (selectedEntry && selectedEntry.id === entryId) {
      setSelectedEntry(updatedEntry);
    }

    // Update in IndexedDB
    try {
      await CaptainsLogStorage.saveLogEntry(updatedEntry);
      console.log(`Updated favorite status for entry ${entryId} to ${updatedEntry.isFavorite}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert(`Error updating favorite status: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle adding a new custom folder
  const handleAddFolder = async (folderName: string) => {
    try {
      console.log('Creating new custom folder:', folderName);

      // Create the folder using Prisma
      const result = await createCustomFolder({
        name: folderName,
        color: '#6b7280' // Default gray color
      });

      if (result.success && result.folder) {
        // Convert to Folder interface and add to state
        const newFolder: Folder = {
          id: result.folder.id,
          name: result.folder.name,
          color: result.folder.color,
          isSystem: false
        };

        // Add to state (positioned after existing custom folders)
        const updatedFolders = [...userFolders, newFolder];
        setUserFolders(updatedFolders);

        console.log('Successfully created custom folder:', newFolder);
      } else {
        console.error('Failed to create custom folder:', result.message);
        alert(`Error creating folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating custom folder:', error);
      alert(`Error creating folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle deleting a custom folder
  const handleDeleteFolder = async (folderId: string) => {
    // Check if it's a system folder
    const isSystem = systemFolders.some(folder => folder.id === folderId);
    if (isSystem) {
      alert('System folders cannot be deleted.');
      return;
    }

    try {
      console.log('Deleting custom folder:', folderId);

      // Delete the folder using Prisma
      const result = await deleteCustomFolder(folderId);

      if (result.success) {
        // Remove from state
        const updatedFolders = userFolders.filter(folder => folder.id !== folderId);
        setUserFolders(updatedFolders);

        // Remove folder assignment from entries (move to uncategorized)
        const updatedEntries = logEntries.map(entry => {
          if (entry.folderId === folderId) {
            return { ...entry, folderId: undefined };
          }
          return entry;
        });

        if (updatedEntries.some(entry => entry.folderId !== logEntries.find(e => e.id === entry.id)?.folderId)) {
          setLogEntries(updatedEntries);

          // Update entries in IndexedDB
          try {
            for (const entry of updatedEntries.filter(e => e.folderId === undefined && logEntries.find(le => le.id === e.id)?.folderId === folderId)) {
              await CaptainsLogStorage.saveLogEntry(entry);
            }
          } catch (error) {
            console.error('Error updating entries after folder deletion:', error);
          }
        }

        console.log('Successfully deleted custom folder:', folderId);
      } else {
        console.error('Failed to delete custom folder:', result.message);
        alert(`Error deleting folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting custom folder:', error);
      alert(`Error deleting folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle renaming a custom folder
  const handleRenameFolder = async (folderId: string, newName: string) => {
    // Find the folder
    const folderToUpdate = userFolders.find(folder => folder.id === folderId);
    if (!folderToUpdate) {
      console.error(`Folder with ID ${folderId} not found for renaming`);
      return;
    }

    // Check if it's a system folder
    const isSystem = systemFolders.some(folder => folder.id === folderId);
    if (isSystem) {
      alert('System folders cannot be renamed.');
      return;
    }

    try {
      console.log('Renaming custom folder:', folderId, 'to:', newName);

      // Update the folder using Prisma
      const result = await updateCustomFolder({
        id: folderId,
        name: newName
      });

      if (result.success) {
        // Update in state
        const updatedFolder = { ...folderToUpdate, name: newName };
        const updatedFolders = userFolders.map(folder =>
          folder.id === folderId ? updatedFolder : folder
        );
        setUserFolders(updatedFolders);

        console.log(`Successfully renamed custom folder ${folderId} to "${newName}"`);
      } else {
        console.error('Failed to rename custom folder:', result.message);
        alert(`Error renaming folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error renaming custom folder:', error);
      alert(`Error renaming folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle assigning an entry to a folder
  const handleAssignToFolder = async (entryId: string, folderId: string) => {
    console.log(`handleAssignToFolder called with entryId=${entryId}, folderId=${folderId}`);

    // Find the entry
    const entryToUpdate = logEntries.find(entry => entry.id === entryId);
    if (!entryToUpdate) {
      console.error(`Entry with ID ${entryId} not found for folder assignment`);
      return;
    }

    console.log(`Original entry:`, entryToUpdate);
    console.log(`Original folderId: ${entryToUpdate.folderId}`);

    try {
      if (folderId === '' || folderId === 'none' || folderId === 'uncategorized') {
        // Move to uncategorized (clear all associations)
        await singleFolderAssociationService.moveToUncategorized(entryId);
        console.log(`Successfully moved entry ${entryId} to uncategorized`);

        // Update in state
        const updatedEntry = {
          ...entryToUpdate,
          folderId: undefined,
          folderType: undefined,
          updatedAt: new Date()
        };

        const updatedEntries = logEntries.map(entry =>
          entry.id === entryId ? updatedEntry : entry
        );
        setLogEntries(updatedEntries);

        if (selectedEntry && selectedEntry.id === entryId) {
          setSelectedEntry(updatedEntry);
        }

        return;
      }

      // Determine folder type and create assignment
      let assignment;
      if (folderId.startsWith('goal:')) {
        const goalId = folderId.replace('goal:', '');
        assignment = {
          folderId: `goal:${goalId}`,
          folderType: 'goal' as const
        };
      } else if (folderId.startsWith('category:')) {
        const categoryId = folderId.replace('category:', '');
        assignment = {
          folderId: `category:${categoryId}`,
          folderType: 'category' as const
        };
      } else {
        // Custom folder
        assignment = {
          folderId: folderId,
          folderType: 'custom' as const
        };
      }

      // Use the new single folder association service
      await singleFolderAssociationService.assignEntryToFolder(entryId, assignment);
      console.log(`Successfully assigned entry ${entryId} to folder ${assignment.folderId} (${assignment.folderType})`);

      // Update in state
      const updatedEntry = {
        ...entryToUpdate,
        folderId: assignment.folderId,
        folderType: assignment.folderType,
        updatedAt: new Date()
      };

      const updatedEntries = logEntries.map(entry =>
        entry.id === entryId ? updatedEntry : entry
      );
      setLogEntries(updatedEntries);

      if (selectedEntry && selectedEntry.id === entryId) {
        setSelectedEntry(updatedEntry);
      }

    } catch (error) {
      console.error('Error assigning entry to folder:', error);
      alert(`Error assigning to folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle database reset
  const handleResetDatabase = () => {
    if (confirm('This will reset the Captain\'s Log database and delete all data. Are you sure?')) {
      setIsResetting(true);
      try {
        // Call the reset function - it will handle the page reload
        resetCaptainsLogDatabase();
      } catch (error) {
        console.error('Error resetting database:', error);
        alert(`Error resetting database: ${error instanceof Error ? error.message : String(error)}`);
        setIsResetting(false);
      }
    }
  };

  if (isLoading) {
    return <CaptainsLogSkeleton />;
  }

  return (
    <div>
      {selectedEntry ? (
        <CaptainsLogDetailSimple
          entry={selectedEntry}
          onBack={handleBackToList}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <>
          {hasVersionError ? (
            <div className="flex flex-col items-center mb-6 p-4 bg-red-100 border border-red-400 rounded">
              <div className="text-red-700 font-bold mb-2">
                Database Version Error Detected!
              </div>
              <div className="text-red-600 mb-4 text-center">
                Your browser has a different database version than expected, which is causing persistence issues.
                Please reset the database to fix this problem.
              </div>
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
                title="Reset database to fix version mismatch"
              >
                {isResetting ? 'Resetting Database...' : 'Reset Database Now'}
              </button>
            </div>
          ) : (
            <div className="flex justify-center items-center mb-4">
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold"
                title="Reset database if you're experiencing persistence issues"
              >
                {isResetting ? 'Resetting Database...' : 'Reset Database (Fix Persistence Issues)'}
              </button>
            </div>
          )}
          <CaptainsLogList
            entries={logEntries}
            onSelectEntry={handleEntrySelect}
            onNewRecording={handleToggleRecording}
            onUploadAudio={handleToggleUpload}
            onToggleFavorite={handleToggleFavorite}
            onDeleteEntry={handleDeleteEntry}
            folders={allFolders}
            onAddFolder={handleAddFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onAssignToFolder={handleAssignToFolder}
            goals={goals}
          />

          {/* Recording and Upload modals are now handled globally */}
        </>
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
