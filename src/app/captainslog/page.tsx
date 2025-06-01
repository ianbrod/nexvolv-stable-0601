'use client';

import { Suspense } from 'react';
import TagBasedCaptainsLogClientWrapper from '@/components/captainslog/TagBasedCaptainsLogClientWrapper';
import { Skeleton } from '@/components/ui/skeleton';

function CaptainsLogSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function CaptainsLogPage() {
  return (
    <div className="w-full h-full" data-captains-log-page>
      <Suspense fallback={<CaptainsLogSkeleton />}>
        <TagBasedCaptainsLogClientWrapper />
      </Suspense>
    </div>
  );
}