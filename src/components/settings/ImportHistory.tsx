'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, FileJson, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { getImportHistory, ImportHistoryEntry } from '@/lib/utils/dataExport';
import { format } from 'date-fns';

export function ImportHistory() {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);

  // Load import history when component mounts
  useEffect(() => {
    setHistory(getImportHistory());
  }, []);

  // Clear import history
  const clearHistory = () => {
    localStorage.removeItem('import-history');
    setHistory([]);
  };

  // If there's no history, show a message
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            View a log of your recent data imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            No import history available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            View a log of your recent data imports
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearHistory}
          className="h-8"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear History
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {history.map((entry, index) => (
              <ImportHistoryItem key={index} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ImportHistoryItemProps {
  entry: ImportHistoryEntry;
}

function ImportHistoryItem({ entry }: ImportHistoryItemProps) {
  // Format the date
  const formattedDate = (() => {
    try {
      return format(new Date(entry.date), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  })();

  return (
    <div className="flex items-start p-3 rounded-lg border">
      <div className="mr-3 mt-1">
        {entry.success ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="font-medium">
            {entry.success ? 'Import Successful' : 'Import Failed'}
            {entry.format && (
              <Badge variant="outline" className="ml-2">
                {entry.format === 'json' ? (
                  <FileJson className="h-3 w-3 mr-1" />
                ) : (
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                )}
                {entry.format.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formattedDate}
          </div>
        </div>

        {entry.success && entry.itemCounts && (
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              Goals: {entry.itemCounts.goals}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Tasks: {entry.itemCounts.tasks}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Categories: {entry.itemCounts.categories}
            </Badge>
          </div>
        )}

        {!entry.success && entry.error && (
          <div className="mt-1 text-sm text-red-500">
            Error: {entry.error}
          </div>
        )}
      </div>
    </div>
  );
}
