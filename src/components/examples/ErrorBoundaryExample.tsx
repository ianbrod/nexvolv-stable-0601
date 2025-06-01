'use client';

import React, { useState } from 'react';
import { ErrorBoundary, withErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Component that throws an error when a button is clicked
 */
function ErrorThrower() {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  if (shouldThrow) {
    throw new Error('This is a simulated error');
  }
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-2">Error Thrower Component</h3>
      <p className="mb-4">Click the button below to simulate an error</p>
      <Button 
        variant="destructive" 
        onClick={() => setShouldThrow(true)}
      >
        Throw Error
      </Button>
    </div>
  );
}

/**
 * Component that throws an error during rendering
 */
function RenderErrorComponent() {
  // This will throw an error during rendering
  const nonExistentObject: any = undefined;
  const value = nonExistentObject.property;
  
  return (
    <div>
      <p>This component will never render: {value}</p>
    </div>
  );
}

/**
 * Component with a custom fallback UI
 */
function ComponentWithCustomFallback() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Custom Error UI</h3>
          <p className="text-yellow-700 mb-4">This is a custom error fallback UI</p>
          <Button 
            variant="outline" 
            className="border-yellow-300 hover:bg-yellow-100"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      }
    >
      <RenderErrorComponent />
    </ErrorBoundary>
  );
}

/**
 * Component wrapped with the withErrorBoundary HOC
 */
const WrappedComponent = withErrorBoundary(
  () => {
    const [count, setCount] = useState(0);
    
    // Throw an error when count reaches 5
    if (count === 5) {
      throw new Error('Count reached 5!');
    }
    
    return (
      <div className="p-4 border rounded-md">
        <h3 className="text-lg font-medium mb-2">HOC Example Component</h3>
        <p className="mb-4">Count: {count} (Will throw error at 5)</p>
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
      </div>
    );
  },
  {
    fallback: (
      <div className="p-4 border border-purple-300 bg-purple-50 rounded-md">
        <h3 className="text-lg font-medium text-purple-800 mb-2">HOC Error Fallback</h3>
        <p className="text-purple-700 mb-4">Error caught by the HOC error boundary</p>
        <Button 
          variant="outline" 
          className="border-purple-300 hover:bg-purple-100"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </div>
    )
  }
);

/**
 * Main example component that demonstrates different error boundary scenarios
 */
export function ErrorBoundaryExample() {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Error Boundary Examples</CardTitle>
        <CardDescription>
          Demonstrating different ways to use error boundaries in React components
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Usage</TabsTrigger>
            <TabsTrigger value="custom">Custom Fallback</TabsTrigger>
            <TabsTrigger value="hoc">HOC Pattern</TabsTrigger>
            <TabsTrigger value="nested">Nested Boundaries</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <div className="space-y-4">
              <p>
                This example shows a basic error boundary that catches errors when a button is clicked.
                The error boundary will display the default error UI when an error occurs.
              </p>
              
              <ErrorBoundary>
                <ErrorThrower />
              </ErrorBoundary>
            </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="space-y-4">
              <p>
                This example shows an error boundary with a custom fallback UI.
                The component will throw an error during rendering, and the error boundary
                will display the custom fallback UI.
              </p>
              
              <ComponentWithCustomFallback />
            </div>
          </TabsContent>
          
          <TabsContent value="hoc">
            <div className="space-y-4">
              <p>
                This example shows a component wrapped with the withErrorBoundary HOC.
                The HOC provides a cleaner way to add error boundaries to components.
              </p>
              
              <WrappedComponent />
            </div>
          </TabsContent>
          
          <TabsContent value="nested">
            <div className="space-y-4">
              <p>
                This example shows nested error boundaries. Each boundary will catch errors
                in its own subtree, preventing the entire UI from crashing.
              </p>
              
              <ErrorBoundary>
                <div className="grid grid-cols-2 gap-4">
                  <ErrorBoundary>
                    <ErrorThrower />
                  </ErrorBoundary>
                  
                  <ErrorBoundary>
                    <ComponentWithCustomFallback />
                  </ErrorBoundary>
                </div>
              </ErrorBoundary>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-gray-500">
          Error boundaries only catch errors in the React component tree.
          They do not catch errors in event handlers or asynchronous code.
        </p>
      </CardFooter>
    </Card>
  );
}

export default ErrorBoundaryExample;
