'use client';

import { useState, useEffect } from 'react';
import { resetDatabase, databaseExists, getDatabaseVersion } from '@/lib/db-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Database, RefreshCw } from 'lucide-react';

export default function DatabaseResetPage() {
  const [dbExists, setDbExists] = useState<boolean | null>(null);
  const [dbVersion, setDbVersion] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check database status on component mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  async function checkDatabaseStatus() {
    try {
      const exists = await databaseExists();
      setDbExists(exists);
      
      if (exists) {
        const version = await getDatabaseVersion();
        setDbVersion(version);
      }
    } catch (error) {
      console.error('Error checking database status:', error);
      setErrorMessage('Failed to check database status');
    }
  }

  async function handleResetDatabase() {
    setIsResetting(true);
    setResetSuccess(null);
    setErrorMessage(null);
    
    try {
      await resetDatabase();
      setResetSuccess(true);
      // Re-check database status
      await checkDatabaseStatus();
    } catch (error) {
      console.error('Error resetting database:', error);
      setResetSuccess(false);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            Use this utility to check and reset the browser database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-sm font-medium">Database Exists:</div>
            <div>{dbExists === null ? 'Checking...' : dbExists ? 'Yes' : 'No'}</div>
            
            <div className="text-sm font-medium">Database Version:</div>
            <div>{dbExists === false ? 'N/A' : dbVersion === null ? 'Unknown' : dbVersion}</div>
          </div>
          
          {resetSuccess === true && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Database was successfully reset. You can now return to the application.
              </AlertDescription>
            </Alert>
          )}
          
          {resetSuccess === false && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {errorMessage || 'Failed to reset database. Please try again or close all browser tabs with this application.'}
              </AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Resetting the database will delete all locally stored data. This action cannot be undone.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={checkDatabaseStatus} disabled={isResetting}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleResetDatabase} 
            disabled={isResetting || dbExists === false}
          >
            {isResetting ? 'Resetting...' : 'Reset Database'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-4 text-center">
        <a href="/" className="text-blue-500 hover:underline">Return to Dashboard</a>
      </div>
    </div>
  );
}
