import React from 'react';
import ErrorHandlingForm from '@/components/examples/ErrorHandlingForm';
import ErrorBoundaryExample from '@/components/examples/ErrorBoundaryExample';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Test page for error handling
 */
export default function ErrorHandlingTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Error Handling Test</h1>

      <Tabs defaultValue="form" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="form">Form Error Handling</TabsTrigger>
          <TabsTrigger value="boundary">Error Boundaries</TabsTrigger>
          <TabsTrigger value="api">API Error Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Form Error Handling</h2>
            <p className="mb-4 text-gray-700">
              This form demonstrates client-side error handling using the <code>useFormError</code> hook.
              Submit the form to see different types of errors.
            </p>

            <ErrorHandlingForm />
          </div>
        </TabsContent>

        <TabsContent value="boundary">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Error Boundaries</h2>
            <p className="mb-4 text-gray-700">
              These examples demonstrate how to use error boundaries to catch and handle errors in React components.
            </p>

            <ErrorBoundaryExample />
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">API Error Handling</h2>
            <p className="mb-4 text-gray-700">
              This example demonstrates how to handle API errors using the <code>useApiErrorToast</code> hook.
              The hook automatically shows toast notifications for API errors.
            </p>

            <div className="p-4 border rounded-md">
              <p className="mb-4">
                Import the <code>useApiErrorToast</code> hook in your component:
              </p>

              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
                <code>{`import { useApiErrorToast } from '@/hooks/useApiErrorToast';

function MyComponent() {
  const { handleApiError } = useApiErrorToast();

  const handleSubmit = async () => {
    const response = await someApiCall();

    if (!handleApiError(response)) {
      // Success! The response was not an error
      // Handle the successful response
    }
  };

  return (
    // Component JSX
  );
}`}</code>
              </pre>

              <p>
                The <code>handleApiError</code> function returns <code>true</code> if the response was an error,
                and <code>false</code> if it was successful. This makes it easy to handle errors in a concise way.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Documentation</h2>
        <p className="mb-4 text-gray-700">
          For more information about the error handling system, see the{' '}
          <a
            href="/docs/error-handling.md"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Error Handling Guide
          </a>.
        </p>
      </div>
    </div>
  );
}
