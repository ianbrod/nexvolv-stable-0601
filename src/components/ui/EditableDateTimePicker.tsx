'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parse, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useTimeSlotSettings } from '@/stores/viewPreferencesStore';

interface EditableDateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  onComplete?: () => void; // Callback when both date and time are selected
  disabled?: (date: Date) => boolean;
  timeStep?: 15 | 30 | 60; // Time slot interval in minutes
  timeRange?: { startHour: number; endHour: number }; // Inclusive hour range (0-23)
}

export function EditableDateTimePicker({
  value,
  onChange,
  onComplete,
  disabled,
  timeStep = 30,
  timeRange, // Will be overridden by store values if not provided
}: EditableDateTimePickerProps) {
  // Get time slot settings from store
  const { timeSlotStartHour, timeSlotEndHour } = useTimeSlotSettings();

  // Use store values if timeRange prop is not provided, with fallback to defaults
  const effectiveTimeRange = React.useMemo(() => {
    if (timeRange) {
      return timeRange;
    }
    // Always use fallback values to ensure time picker works
    // Even if store hasn't hydrated yet
    return {
      startHour: 5,  // Always use default 5 AM
      endHour: 23    // Always use default 11 PM
    };
  }, [timeRange]);
  // Track selection state
  const [selectionState, setSelectionState] = React.useState<"initial" | "dateSelected" | "complete">("initial");

  // State for the manual time input
  const [manualTimeInput, setManualTimeInput] = React.useState<string>('');
  const [isEditingTime, setIsEditingTime] = React.useState(false);

  // Determine the date part for the calendar display
  const displayDate = (value instanceof Date && !isNaN(value.getTime()))
    ? startOfDay(value)
    : startOfDay(new Date());

  // Determine the time part for highlighting the selected time slot
  let displayTime: string | null = null;
  try {
    if (value instanceof Date && !isNaN(value.getTime())) {
      displayTime = format(value, "h:mm a");
    }
  } catch (error) {
    console.error("[EditableDateTimePicker] Error formatting displayTime:", error);
  }

  // Generate time slots based on effective time range
  const timeSlots = React.useMemo(() => {
    const slots = [];

    for (let hour = effectiveTimeRange.startHour; hour <= effectiveTimeRange.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeStep) {
        if (hour === effectiveTimeRange.endHour && minute > 0) continue;
        try {
          const timeSlotDate = setMinutes(setHours(new Date(), hour), minute);
          const formattedSlot = format(timeSlotDate, "h:mm a");
          slots.push(formattedSlot);
        } catch (error) {
          console.error("[EditableDateTimePicker] Error formatting time slot:", error);
        }
      }
    }
    return slots;
  }, [timeStep, effectiveTimeRange]);

  // Initialize manual time input when value changes
  React.useEffect(() => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      setManualTimeInput(format(value, "h:mm a"));
    }
  }, [value]);

  // Handle date selection
  const handleDateSelect = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      onChange(null);
      setSelectionState("initial");
      return;
    }

    const newDatePart = startOfDay(selectedDay);
    let combinedDate: Date;

    // Check if the current value has a time component
    if (value instanceof Date && !isNaN(value.getTime())) {
      // Keep existing time, just change the date part
      let hours = value.getHours();
      let minutes = value.getMinutes();
      combinedDate = setMinutes(setHours(newDatePart, hours), minutes);
    } else {
      // No existing time, set to midnight of the new date
      combinedDate = newDatePart;
    }

    // Ensure seconds and milliseconds are zeroed out
    combinedDate = setSeconds(combinedDate, 0);
    combinedDate = setMilliseconds(combinedDate, 0);

    onChange(combinedDate);
    setSelectionState("dateSelected");

    // Auto-scroll to the current time or a reasonable default time
    if (timeSlotRef.current) {
      const currentHour = new Date().getHours();
      const closestHour = Math.max(timeRange.startHour, Math.min(currentHour, timeRange.endHour));
      const scrollIndex = Math.floor((closestHour - timeRange.startHour) * (60 / timeStep));

      setTimeout(() => {
        const buttons = timeSlotRef.current?.querySelectorAll('button');
        if (buttons && buttons.length > 0) {
          const targetIndex = Math.min(scrollIndex, buttons.length - 1);
          buttons[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Handle time selection from preset buttons
  const handleTimeSelect = (timeString: string) => {
    // Parse the selected time string (e.g., "5:30 PM")
    const parts = timeString.match(/(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!parts) return;

    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const ampm = parts[3];

    // Convert 12-hour format to 24-hour format
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    // Create a new date with the selected time
    let newDate: Date;

    if (value instanceof Date && !isNaN(value.getTime())) {
      // Keep the existing date part, just change the time
      newDate = new Date(value);
    } else {
      // No existing date, use today
      newDate = startOfDay(new Date());
    }

    newDate = setHours(newDate, hours);
    newDate = setMinutes(newDate, minutes);
    newDate = setSeconds(newDate, 0);
    newDate = setMilliseconds(newDate, 0);

    onChange(newDate);
    setManualTimeInput(timeString);
    setSelectionState("complete");

    // Trigger the onComplete callback after a short delay
    if (onComplete) {
      setTimeout(() => {
        onComplete();
      }, 150);
    }
  };

  // Handle manual time input
  const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualTimeInput(e.target.value);
  };

  // Apply manual time input when user presses Enter or input loses focus
  const applyManualTime = () => {
    if (!manualTimeInput || !value) return;

    try {
      // Try to parse the manual input in various formats
      let newDate: Date | null = null;

      // Try h:mm a format (e.g., "1:30 PM")
      try {
        const parsedDate = parse(manualTimeInput, "h:mm a", new Date());
        if (isValid(parsedDate)) {
          newDate = parsedDate;
        }
      } catch (e) {
        // Parsing failed, try next format
      }

      // Try h:mm format (e.g., "13:30")
      if (!newDate) {
        try {
          const parsedDate = parse(manualTimeInput, "H:mm", new Date());
          if (isValid(parsedDate)) {
            newDate = parsedDate;
          }
        } catch (e) {
          // Parsing failed, try next format
        }
      }

      // If we successfully parsed a time
      if (newDate) {
        // Keep the existing date part, just change the time
        const existingDate = new Date(value);
        existingDate.setHours(newDate.getHours(), newDate.getMinutes(), 0, 0);

        onChange(existingDate);
        // Format the time consistently
        setManualTimeInput(format(existingDate, "h:mm a"));
        setSelectionState("complete");

        // Trigger the onComplete callback
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 150);
        }
      } else {
        // If parsing failed, revert to the current value's formatted time
        if (value) {
          setManualTimeInput(format(value, "h:mm a"));
        }
      }
    } catch (error) {
      console.error("[EditableDateTimePicker] Error parsing manual time:", error);
      // Revert to the current value's formatted time
      if (value) {
        setManualTimeInput(format(value, "h:mm a"));
      }
    }

    setIsEditingTime(false);
  };

  // Handle key press in manual time input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyManualTime();
    }
  };

  // Reference to the time slots container for scrolling
  const timeSlotRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Set up wheel event handler for scrolling
  React.useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default only if we're hovering over the component
      e.preventDefault();

      // Get the scroll container (the element that actually scrolls)
      const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollContainer) return;

      // Scroll by the wheel delta
      scrollContainer.scrollTop += e.deltaY;
    };

    scrollArea.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollArea.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex max-sm:flex-col">
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={displayDate}
          onSelect={handleDateSelect}
          className="p-2 sm:pe-5 bg-background"
          disabled={disabled}
        />

        {/* Time Picker */}
        <div className="relative w-full max-sm:h-48 sm:w-40">
          <div className="absolute inset-0 border-border max-sm:border-t flex flex-col">
            {/* Fixed header with manual time input */}
            <div className="flex flex-col gap-2 px-5 py-4 border-b border-border bg-background shrink-0">
              <p className="text-sm font-medium">
                {selectionState === "dateSelected" ? "Select time" : "Time"}
              </p>

              {/* Manual time input */}
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {isEditingTime ? (
                  <Input
                    value={manualTimeInput}
                    onChange={handleManualTimeChange}
                    onBlur={applyManualTime}
                    onKeyDown={handleKeyDown}
                    className="h-7 text-xs"
                    autoFocus
                    data-testid="time-input-field"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs justify-start w-full bg-secondary/50 hover:bg-secondary"
                    onClick={() => setIsEditingTime(true)}
                    data-testid="time-edit-button"
                  >
                    <span className="underline underline-offset-4">{displayTime || "Enter time"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable time slots */}
            <div className="flex-1 min-h-0">
              <ScrollArea ref={scrollAreaRef} className="h-full border-border sm:border-s" type="always">
                <div className="p-5" ref={timeSlotRef}>
                  <div className="grid gap-1.5 max-sm:grid-cols-3">
                    {timeSlots.map((timeSlot) => (
                      <Button
                        key={timeSlot}
                        variant={displayTime === timeSlot ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "w-full text-xs h-8",
                          selectionState === "dateSelected" && "animate-pulse-subtle"
                        )}
                        onClick={() => handleTimeSelect(timeSlot)}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
