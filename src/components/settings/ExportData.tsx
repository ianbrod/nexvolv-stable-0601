'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

import { exportAllData } from '@/actions/data-management';

export function ExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportAllData();

      if (result.success && result.data && result.filename) {
        // Create a download link
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Export successful');
        // File download will happen automatically, no need for additional notification
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Failed to export data'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="py-3">
      <CardHeader className="px-4 pb-1">
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download all your data as a JSON backup file.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-0">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export All Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
