'use client';

import { Card } from '@/components/ui/card';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="w-full px-4 py-2 h-[calc(100vh-4rem)] flex flex-col">
      <h1 className="text-2xl font-bold mb-2 flex-shrink-0">Settings</h1>

      <Card className="px-4 py-3 flex-1 overflow-hidden min-h-0">
        <div className="h-full">
          {children}
        </div>
      </Card>
    </div>
  );
}
