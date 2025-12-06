import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>(() => {
    if (date?.from && date?.to) {
      const today = new Date();
      if (
        format(date.from, "yyyy-MM-dd") ===
          format(startOfMonth(today), "yyyy-MM-dd") &&
        format(date.to, "yyyy-MM-dd") ===
          format(endOfMonth(today), "yyyy-MM-dd")
      ) {
        return "this_month";
      }
    }
    return "custom";
  });

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const today = new Date();

    switch (value) {
      case "this_month":
        setDate({
          from: startOfMonth(today),
          to: endOfMonth(today),
        });
        break;
      case "last_month":
        const lastMonth = subMonths(today, 1);
        setDate({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      case "last_3_months":
        setDate({
          from: subMonths(today, 3),
          to: today,
        });
        break;
      case "ytd":
        setDate({
          from: startOfYear(today),
          to: today, // or endOfYear(today) if we want full year context
        });
        break;
      case "all_time":
        // Arbitrary far back date or handle efficiently in parent
        // For now, let's say 5 years back
        setDate({
          from: subMonths(today, 60),
          to: today,
        });
        break;
      case "custom":
        // Do nothing, let user pick
        break;
    }
  };

  // Update preset select if date changes manually to something that doesn't match?
  // Ideally yes, but simpler to just set to 'custom' if user clicks calendar.
  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    setDate(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal bg-white shadow-sm border-2 border-foreground hover:bg-slate-50 hover:text-foreground",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedPreset !== "custom" ? (
              <span>
                {
                  {
                    this_month: "This Month",
                    last_month: "Last Month",
                    last_3_months: "Last 3 Months",
                    ytd: "Year to Date",
                    all_time: "All Time",
                  }[selectedPreset]
                }
              </span>
            ) : date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-2 border-foreground shadow-hard"
          align="end"
        >
          <div className="p-3 border-b border-border">
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select range..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Range</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedPreset === "custom" && (
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
