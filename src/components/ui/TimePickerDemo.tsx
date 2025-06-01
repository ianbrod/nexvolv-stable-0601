"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SingleClickDateTimePicker } from "@/components/ui/SingleClickDateTimePicker";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimePickerDemo() {
  const [date, setDate] = React.useState<Date | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleDateChange = (newDate: Date | null) => {
    setDate(newDate);
  };

  const handleComplete = () => {
    setOpen(false);
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-xl font-bold">Time Picker Demo</h2>
      <p className="text-muted-foreground">
        This demonstrates the new single-click time picker component.
      </p>
      
      <div className="flex flex-col space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP p") : <span>Pick a date and time</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <SingleClickDateTimePicker
              value={date}
              onChange={handleDateChange}
              onComplete={handleComplete}
            />
          </PopoverContent>
        </Popover>
        
        <div className="text-sm">
          {date && (
            <p>
              Selected: <span className="font-medium">{format(date, "PPP 'at' p")}</span>
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Features</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Single-click selection for both date and time</li>
          <li>Auto-closes after time selection</li>
          <li>Visual cues to guide the user through the selection process</li>
          <li>Smooth scrolling to relevant time slots</li>
          <li>Improved accessibility and user experience</li>
        </ul>
      </div>
    </div>
  );
}
