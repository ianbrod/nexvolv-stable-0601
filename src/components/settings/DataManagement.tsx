'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { importData, deleteAllData } from '@/actions/data-management';
import { AlertTriangle, Check, X, FileJson, FileSpreadsheet, Info, Database } from 'lucide-react';

import { ImportHistory } from './ImportHistory';
import { ExportData } from './ExportData';
/**
 * Clear IndexedDB/Dexie voice records and transcription data
 */
async function clearVoiceData(): Promise<void> {
  try {
    console.log('Clearing voice and transcription data...');

    // Clear any voice-related localStorage with CORRECT key patterns
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('voice') ||
        key.includes('transcription') ||
        key.includes('audio') ||
        key.includes('captains') ||
        key.includes('tag') ||
        key.includes('nexvolv')
      )) {
        keysToRemove.push(key);
      }
    }

    // Also clear specific known localStorage keys
    const specificKeys = [
      'captainsLogEntries',
      'captainsLogFolders',
      'tagBasedEntries',
      'nexvolvData',
      'transcriptionCache',
      'voiceRecordings'
    ];

    specificKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        keysToRemove.push(key);
      }
    });

    console.log('Clearing localStorage keys:', keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear IndexedDB databases related to voice/audio
    if ('indexedDB' in window) {
      try {
        // Use the CORRECT database names that are actually used in the app
        const dbNames = ['captainsLogDatabase', 'tagBasedDatabase', 'nexvolvDatabase'];
        console.log('Attempting to delete IndexedDB databases:', dbNames);

        for (const dbName of dbNames) {
          try {
            await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => {
                console.log(`✅ Successfully deleted database: ${dbName}`);
                resolve(true);
              };
              deleteReq.onerror = (event) => {
                console.warn(`⚠️ Error deleting database ${dbName}:`, event);
                resolve(true); // Don't fail if DB doesn't exist
              };
              deleteReq.onblocked = () => {
                console.warn(`⚠️ Database ${dbName} deletion blocked. Close other tabs and try again.`);
                resolve(true);
              };
            });
          } catch (e) {
            console.warn(`Error deleting database ${dbName}:`, e);
            // Ignore errors for non-existent databases
          }
        }
      } catch (e) {
        console.warn('Could not clear some IndexedDB databases:', e);
      }
    }

    // Clear sessionStorage as well
    try {
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');
    } catch (e) {
      console.warn('Could not clear sessionStorage:', e);
    }

    console.log('Voice and transcription data cleared successfully');

    // Force a page reload to ensure clean state (similar to Captain's Log reset)
    console.log('Reloading page to complete cleanup...');
    setTimeout(() => {
      window.location.reload();
    }, 1000); // Give time for the success toast to show

  } catch (error) {
    console.error('Error clearing voice data:', error);
    throw error;
  }
}

export function DataManagement() {
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [fileFormat, setFileFormat] = useState<'json' | 'csv'>('json');
  const [showHistory, setShowHistory] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file for later use
    setImportFile(file);

    // Reset states
    setImportStatus('idle');
    setImportMessage('');
    setIsImporting(true);

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;

          // Detect file format
          const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
          setFileFormat(format);

          // For now, directly import the data (we can add preview later if needed)
          const result = await importData(fileContent);

          if (result.success) {
            setImportStatus('success');
            setImportMessage(`Data imported successfully. Imported ${result.itemCounts?.goals || 0} goals, ${result.itemCounts?.tasks || 0} tasks, and ${result.itemCounts?.categories || 0} categories.`);
            console.log('Import successful:', result);
          } else {
            const errorMessage = result.message || result.error?.message || 'Failed to import data';
            throw new Error(errorMessage);
          }
        } catch (error) {
          setImportStatus('error');
          setImportMessage(error instanceof Error ? error.message : 'Failed to process the file');
          console.error('Import failed:', error);
        } finally {
          setIsImporting(false);
          // Reset the file input
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        setImportStatus('error');
        setImportMessage('Failed to read the file.');
        setIsImporting(false);
        // Reset the file input
        event.target.value = '';
      };

      reader.readAsText(file);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Failed to process the file');
      setIsImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAllData();

      if (result.success) {
        console.log('Data deleted successfully');
        alert('All your data has been deleted successfully.');
      } else {
        const errorMessage = result.message || result.error?.message || 'Failed to delete data';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Failed to delete data'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle voice data cleanup
  const handleClearVoiceData = async () => {
    if (confirm('This will clear all voice records and transcription data from IndexedDB and localStorage. Are you sure?')) {
      setIsResetting(true);
      try {
        await clearVoiceData();
        console.log('Voice data cleared successfully');
        alert('All voice records and transcription data have been cleared successfully.');
      } catch (error) {
        console.error('Error clearing voice data:', error);
        alert(`Clear failed: ${error instanceof Error ? error.message : 'Failed to clear voice data'}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-2 h-full overflow-y-auto overflow-x-hidden min-h-0">
      <Card className="py-3">
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-1">
          <div>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>
              Import data from JSON or CSV files.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="h-8"
          >
            <Info className="h-4 w-4 mr-2" />
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
        </CardHeader>
        <CardContent className="px-4 py-0">
          {showHistory ? (
            <ImportHistory />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                >
                  <label>
                    <FileJson className="mr-2 h-4 w-4" />
                    {isImporting ? 'Processing...' : 'Import JSON'}
                    <input
                      type="file"
                      accept=".json"
                      className="sr-only"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                    />
                  </label>
                </Button>

                <Button
                  asChild
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  <label>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {isImporting ? 'Processing...' : 'Import CSV'}
                    <input
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                    />
                  </label>
                </Button>
              </div>

              {importStatus === 'success' && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{importMessage}</AlertDescription>
                </Alert>
              )}

              {importStatus === 'error' && (
                <Alert variant="destructive">
                  <X className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{importMessage}</AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                Warning: Importing data will replace all your existing data. Make sure to export your current data first if you want to keep it.
              </p>

              <div className="mt-4 p-3 bg-muted rounded-md">
                <h4 className="text-sm font-medium mb-2">Supported Formats:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center">
                    <FileJson className="h-3 w-3 mr-2" />
                    <span>JSON - Full backup with all data types</span>
                  </li>
                  <li className="flex items-center">
                    <FileSpreadsheet className="h-3 w-3 mr-2" />
                    <span>CSV - Import goals or tasks (headers required)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardHeader className="px-4 pb-1">
          <CardTitle>Clear Voice Data</CardTitle>
          <CardDescription>
            Clear all voice records and transcription data from IndexedDB and localStorage.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto" disabled={isResetting}>
                <Database className="mr-2 h-4 w-4" />
                {isResetting ? 'Clearing...' : 'Clear Voice Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Voice Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all voice records and transcription data stored in IndexedDB and localStorage. This action is useful for cleaning up old voice data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearVoiceData}
                  disabled={isResetting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isResetting ? 'Clearing...' : 'Yes, clear voice data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-sm text-muted-foreground mt-4">
            Warning: This action will delete all voice records and transcription data and cannot be undone.
          </p>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardHeader className="px-4 pb-1">
          <CardTitle>Delete All Data</CardTitle>
          <CardDescription>
            Permanently delete all your data from the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your data including goals, tasks, categories, and other information.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete all data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-sm text-muted-foreground mt-4">
            Warning: This action is irreversible. All your data will be permanently deleted.
          </p>
        </CardContent>
      </Card>

      <ExportData />
    </div>
  );
}
