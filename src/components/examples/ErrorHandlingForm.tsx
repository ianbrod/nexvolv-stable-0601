'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormError } from '@/hooks/useFormError';
import { ErrorBoundary } from '@/components/ui/error-boundary';


// Define a schema for the form
const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Infer the type from the schema
type FormValues = z.infer<typeof formSchema>;

// Mock server action for demonstration
async function submitForm(values: FormValues) {
  // Simulate a server action
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Randomly succeed or fail
      if (Math.random() > 0.5) {
        resolve({ success: true, data: values });
      } else {
        // Simulate different types of errors
        const errorTypes = [
          { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: { email: ['Email already exists'] } },
          { code: 'DATABASE_ERROR', message: 'Database operation failed' },
          { code: 'UNAUTHORIZED', message: 'You must be logged in to submit the form' },
          new Error('Something went wrong'),
        ];

        reject(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
      }
    }, 1000);
  });
}

/**
 * Example form component that demonstrates error handling
 */
export function ErrorHandlingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    hasError,
    message,
    fieldErrors,
    handleError,
    clearErrors
  } = useFormError();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    clearErrors();
    setIsSubmitting(true);

    try {
      const result = await submitForm(data);
      console.log('Form submitted successfully');
      reset();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Contact Form</h2>

        {hasError && message && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-medium">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {(errors.name || fieldErrors.name) && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name?.message || fieldErrors.name?.[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {(errors.email || fieldErrors.email) && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email?.message || fieldErrors.email?.[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              id="message"
              {...register('message')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {(errors.message || fieldErrors.message) && (
              <p className="mt-1 text-sm text-red-600">
                {errors.message?.message || fieldErrors.message?.[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </ErrorBoundary>
  );
}

export default ErrorHandlingForm;
