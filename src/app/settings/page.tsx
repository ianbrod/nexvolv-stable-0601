'use client';

import { DataManagement } from '@/components/settings/DataManagement';
import { APIKeyConfiguration } from '@/components/settings/APIKeyConfiguration';
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings';

import { CSVImportTemplate } from '@/components/settings/CSVImportTemplate';
import { SettingsLayout } from '@/components/settings/SettingsLayout';

export default function SettingsPage() {
  return (
    <SettingsLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0">
        {/* Left Panel */}
        <div className="space-y-2 h-full overflow-hidden min-h-0">
          <APIKeyConfiguration />
          <TimeSlotSettings />
          <CSVImportTemplate />
        </div>

        {/* Right Panel */}
        <div className="h-full min-h-0">
          <DataManagement />
        </div>
      </div>
    </SettingsLayout>
  );
}
