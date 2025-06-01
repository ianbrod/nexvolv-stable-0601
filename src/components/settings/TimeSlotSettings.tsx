'use client';

import { useTimeSlotSettings, useSetTimeSlotStartHour, useSetTimeSlotEndHour } from '@/stores/viewPreferencesStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

export function TimeSlotSettings() {
  const { timeSlotStartHour, timeSlotEndHour } = useTimeSlotSettings();
  const setTimeSlotStartHour = useSetTimeSlotStartHour();
  const setTimeSlotEndHour = useSetTimeSlotEndHour();

  // Convert 24-hour to 12-hour format for display
  const convertTo12Hour = (hour: number) => {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return { hour12, ampm };
  };

  // Convert 12-hour format back to 24-hour
  const convertTo24Hour = (hour12: number, ampm: string) => {
    if (ampm === 'AM') {
      return hour12 === 12 ? 0 : hour12;
    } else {
      return hour12 === 12 ? 12 : hour12 + 12;
    }
  };

  const currentStart = convertTo12Hour(timeSlotStartHour);
  const currentEnd = convertTo12Hour(timeSlotEndHour);

  // Handle start time change - automatically calculate end hour to maintain 19-hour block
  const handleStartTimeChange = (hour12: number, ampm: string) => {
    const newStartHour = convertTo24Hour(hour12, ampm);
    setTimeSlotStartHour(newStartHour);

    // Auto-calculate end hour to maintain 19-hour block
    const newEndHour = (newStartHour + 18) % 24;
    setTimeSlotEndHour(newEndHour);
  };

  return (
    <Card className="py-3">
      <CardHeader className="px-4 pb-1">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Slot Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 py-0">
        {/* Time Selection Row */}
        <div className="space-y-2">
          <Label>Start Time</Label>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Select
                value={currentStart.hour12.toString()}
                onValueChange={(value) => handleStartTimeChange(parseInt(value), currentStart.ampm)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={currentStart.ampm}
                onValueChange={(value) => handleStartTimeChange(currentStart.hour12, value)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* End Time Display - Now inline */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>→</span>
              <span className="font-medium">
                {currentEnd.hour12}:00 {currentEnd.ampm} (19 hours)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
