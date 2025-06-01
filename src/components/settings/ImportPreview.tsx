'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, AlertTriangle, FileJson, FileSpreadsheet } from 'lucide-react';

interface ImportPreviewProps {
  data: any;
  format: 'json' | 'csv';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ data, format, onConfirm, onCancel }: ImportPreviewProps) {
  const [activeTab, setActiveTab] = useState('goals');
  const [previewData, setPreviewData] = useState<any>({
    goals: [],
    tasks: [],
    categories: [],
  });

  // Prepare preview data when component mounts or data changes
  useEffect(() => {
    if (!data) return;

    // Extract a sample of each data type for preview
    const extractSample = (items: any[], maxItems = 5) => {
      return Array.isArray(items) ? items.slice(0, maxItems) : [];
    };

    setPreviewData({
      goals: extractSample(data.goals),
      tasks: extractSample(data.tasks),
      categories: extractSample(data.categories),
    });
  }, [data]);

  // Get counts for each data type
  const counts = {
    goals: data?.goals?.length || 0,
    tasks: data?.tasks?.length || 0,
    categories: data?.categories?.length || 0,
  };

  // Determine if there are any items to import
  const hasItems = counts.goals > 0 || counts.tasks > 0 || counts.categories > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          {format === 'json' ? (
            <FileJson className="mr-2 h-5 w-5" />
          ) : (
            <FileSpreadsheet className="mr-2 h-5 w-5" />
          )}
          Import Preview
          <Badge variant="outline" className="ml-2">
            {format.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Review the data before importing. This will replace all your existing data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold">No Data to Import</h3>
            <p className="text-muted-foreground mt-2">
              The selected file doesn't contain any valid data to import.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-2">
                <Badge variant="secondary">
                  Goals: {counts.goals}
                </Badge>
                <Badge variant="secondary">
                  Tasks: {counts.tasks}
                </Badge>
                <Badge variant="secondary">
                  Categories: {counts.categories}
                </Badge>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[300px] rounded-md border">
                <TabsContent value="goals" className="p-0 m-0">
                  <PreviewTable
                    data={previewData.goals}
                    totalCount={counts.goals}
                    emptyMessage="No goals to import"
                  />
                </TabsContent>

                <TabsContent value="tasks" className="p-0 m-0">
                  <PreviewTable
                    data={previewData.tasks}
                    totalCount={counts.tasks}
                    emptyMessage="No tasks to import"
                  />
                </TabsContent>

                <TabsContent value="categories" className="p-0 m-0">
                  <PreviewTable
                    data={previewData.categories}
                    totalCount={counts.categories}
                    emptyMessage="No categories to import"
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!hasItems}>
          <Check className="mr-2 h-4 w-4" />
          Confirm Import
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PreviewTableProps {
  data: any[];
  totalCount: number;
  emptyMessage: string;
}

function PreviewTable({ data, totalCount, emptyMessage }: PreviewTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Get column headers from the first item
  const columns = Object.keys(data[0]).filter(key =>
    // Filter out complex objects and long text fields
    typeof data[0][key] !== 'object' || data[0][key] === null
  );

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map(column => (
                <TableCell key={`${index}-${column}`}>
                  {formatCellValue(item[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalCount > data.length && (
        <div className="p-2 text-center text-sm text-muted-foreground">
          Showing {data.length} of {totalCount} items
        </div>
      )}
    </div>
  );
}

// Helper function to format cell values for display
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
