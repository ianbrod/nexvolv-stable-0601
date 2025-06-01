'use client';

import React, { useState } from 'react';
import { ReminderForm } from '@/components/reminders/ReminderForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestRecurrencePage() {
  const [showForm, setShowForm] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleFormSuccess = (reminder: any) => {
    console.log('Reminder created:', reminder);
    setTestResults(prev => [...prev, reminder]);
    setShowForm(false);
  };

  const testEnhancedRecurrence = () => {
    // Test the enhanced recurrence logic
    const testConfig = {
      recurrence: 'weekly',
      recurrenceInterval: 2,
      weeklyDays: '1,3,5', // Mon, Wed, Fri
      maxOccurrences: 5,
    };

    console.log('Testing enhanced recurrence with config:', testConfig);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enhanced Recurrence Test</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : 'Test Reminder Form'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Enhanced Recurring Reminder</CardTitle>
          </CardHeader>
          <CardContent>
            <ReminderForm
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
              categories={[]}
              goals={[]}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Test Enhanced Recurrence Logic</h2>
          <Button onClick={testEnhancedRecurrence} variant="outline">
            Run Test
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enhanced Recurrence Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Basic Patterns</h3>
                <ul className="text-sm space-y-1">
                  <li>✅ Daily (every N days)</li>
                  <li>✅ Weekly (every N weeks)</li>
                  <li>✅ Monthly (every N months)</li>
                  <li>✅ Yearly (every N years)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Advanced Features</h3>
                <ul className="text-sm space-y-1">
                  <li>✅ Custom intervals (every 2 weeks, etc.)</li>
                  <li>✅ Weekly: specific days (Mon, Wed, Fri)</li>
                  <li>✅ Monthly: by date or weekday</li>
                  <li>✅ Monthly: nth weekday (2nd Tuesday, last Friday)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Termination Options</h3>
                <ul className="text-sm space-y-1">
                  <li>✅ Never ends</li>
                  <li>✅ End after N occurrences</li>
                  <li>✅ End by specific date</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Examples</h3>
                <ul className="text-sm space-y-1">
                  <li>• Every 2 weeks on Mon, Wed, Fri</li>
                  <li>• 2nd Tuesday of every month</li>
                  <li>• Last Friday of every 3 months</li>
                  <li>• Daily for 30 occurrences</li>
                  <li>• Weekly until Dec 31, 2024</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
