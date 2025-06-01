'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { triggerRecording, triggerUpload } from '@/lib/events/recording-events';
import { Mic, Upload } from 'lucide-react';

/**
 * Test page to verify Quick Record functionality works from any page
 * This page tests the global accessibility of the recording modal
 */
export default function TestQuickRecordPage() {
  const handleTestRecording = () => {
    console.log('Testing recording trigger from test page');
    triggerRecording();
  };

  const handleTestUpload = () => {
    console.log('Testing upload trigger from test page');
    triggerUpload();
  };

  return (
    <div className="w-full px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quick Record Global Accessibility Test</h1>
          <p className="text-muted-foreground mt-2">
            This page tests that the Quick Record functionality works from any application page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Recording Modal Test
              </CardTitle>
              <CardDescription>
                Test triggering the recording modal from this page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTestRecording}
                className="w-full"
                size="lg"
              >
                <Mic className="h-4 w-4 mr-2" />
                Trigger Recording Modal
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This should open the recording modal regardless of which page you're on.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Modal Test
              </CardTitle>
              <CardDescription>
                Test triggering the upload modal from this page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTestUpload}
                className="w-full"
                size="lg"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Trigger Upload Modal
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This should open the upload modal regardless of which page you're on.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
            <CardDescription>
              Follow these steps to verify global accessibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click the "Trigger Recording Modal" button above - the recording modal should open</li>
              <li>Close the modal and navigate to different pages (Tasks, Goals, Settings, etc.)</li>
              <li>Try clicking the Quick Record button in the sidebar from each page</li>
              <li>Verify the recording modal opens consistently from all pages</li>
              <li>Test the upload functionality similarly</li>
              <li>Ensure modal state is properly cleaned up when navigating between pages</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expected Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Recording modal should open from any page when triggered</li>
              <li>Modal should function identically regardless of the current page context</li>
              <li>Recordings should be saved to the Captain's Log storage system</li>
              <li>Modal state should be properly managed across page transitions</li>
              <li>No duplicate modals should appear</li>
              <li>Modal should close properly and clean up resources</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
