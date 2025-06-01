'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAudioUrlStats, migrateBrokenAudioUrls } from '@/lib/utils/audio-url-migration';

interface AudioUrlStats {
  totalEntries: number;
  entriesWithAudio: number;
  validDataUrls: number;
  brokenBlobUrls: number;
  emptyAudioUrls: number;
  otherUrls: number;
}

export function AudioUrlDebugPanel() {
  const [stats, setStats] = useState<AudioUrlStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const audioStats = await getAudioUrlStats();
      setStats(audioStats);
    } catch (error) {
      console.error('Error loading audio URL stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateBrokenAudioUrls();
      setMigrationResult(
        `Migration complete! Fixed ${result.fixedEntries} out of ${result.brokenEntries} broken entries.`
      );
      // Reload stats after migration
      await loadStats();
    } catch (error) {
      console.error('Error during migration:', error);
      setMigrationResult('Migration failed. Check console for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Audio URL Debug Panel</CardTitle>
        <CardDescription>
          Check and fix audio URL issues in your log entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={loadStats} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Check Audio URLs'}
          </Button>
          {stats && stats.brokenBlobUrls > 0 && (
            <Button 
              onClick={runMigration} 
              disabled={isMigrating}
              variant="destructive"
            >
              {isMigrating ? 'Fixing...' : `Fix ${stats.brokenBlobUrls} Broken URLs`}
            </Button>
          )}
        </div>

        {stats && (
          <div className="space-y-3">
            <h3 className="font-semibold">Audio URL Statistics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span>Total Entries:</span>
                <Badge variant="outline">{stats.totalEntries}</Badge>
              </div>
              <div className="flex justify-between">
                <span>With Audio:</span>
                <Badge variant="outline">{stats.entriesWithAudio}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Valid Data URLs:</span>
                <Badge variant="default">{stats.validDataUrls}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Broken Blob URLs:</span>
                <Badge variant={stats.brokenBlobUrls > 0 ? "destructive" : "outline"}>
                  {stats.brokenBlobUrls}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Empty Audio URLs:</span>
                <Badge variant="secondary">{stats.emptyAudioUrls}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Other URLs:</span>
                <Badge variant="outline">{stats.otherUrls}</Badge>
              </div>
            </div>

            {stats.brokenBlobUrls > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ⚠️ Found {stats.brokenBlobUrls} entries with broken blob URLs. 
                  These audio files won't play. Click "Fix Broken URLs" to resolve this.
                </p>
              </div>
            )}

            {stats.brokenBlobUrls === 0 && stats.entriesWithAudio > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✅ All audio URLs are valid! No migration needed.
                </p>
              </div>
            )}
          </div>
        )}

        {migrationResult && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">{migrationResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
