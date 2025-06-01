'use client';

import { useTaskView, useSetTaskView, usePanelState, useSetCollapseLeftPanel, useSetCollapseRightPanel } from '@/stores/viewPreferencesStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Menu, LayoutGrid } from 'lucide-react';

export function ViewPreferences() {
  const taskView = useTaskView();
  const setTaskView = useSetTaskView();
  const { collapseLeftPanel, collapseRightPanel } = usePanelState();
  const setCollapseLeftPanel = useSetCollapseLeftPanel();
  const setCollapseRightPanel = useSetCollapseRightPanel();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task View</CardTitle>
          <CardDescription>
            Choose how you want to view your tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={taskView}
            onValueChange={(value) => setTaskView(value as 'list' | 'board')}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="list"
                id="view-list"
                className="peer sr-only"
              />
              <Label
                htmlFor="view-list"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Menu className="mb-3 h-6 w-6" />
                List View
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="board"
                id="view-board"
                className="peer sr-only"
              />
              <Label
                htmlFor="view-board"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <LayoutGrid className="mb-3 h-6 w-6" />
                Board View
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mobile Layout</CardTitle>
          <CardDescription>
            Configure how the app behaves on smaller screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="collapse-left" className="flex flex-col space-y-1">
              <span>Collapse Left Panel</span>
              <span className="font-normal text-xs text-muted-foreground">
                Automatically collapse the navigation panel on mobile devices
              </span>
            </Label>
            <Switch
              id="collapse-left"
              checked={collapseLeftPanel}
              onCheckedChange={setCollapseLeftPanel}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="collapse-right" className="flex flex-col space-y-1">
              <span>Collapse Right Panel</span>
              <span className="font-normal text-xs text-muted-foreground">
                Automatically collapse the AI assistant panel on mobile devices
              </span>
            </Label>
            <Switch
              id="collapse-right"
              checked={collapseRightPanel}
              onCheckedChange={setCollapseRightPanel}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}