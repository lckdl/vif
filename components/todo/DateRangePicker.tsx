"use client";

import { useState } from "react";
import { Calendar, Check, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isToday, isYesterday, isTomorrow } from "date-fns";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import styles from "./DateRangePicker.module.css";

export interface DateRangePickerProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
    key: string;
  };
  onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  className?: string;
}

export function DateRangePicker({ 
  dateRange, 
  onDateRangeChange,
  className 
}: DateRangePickerProps) {
  // Ensure dates are properly converted to Date objects
  const normalizedDateRange = {
    startDate: dateRange.startDate instanceof Date ? dateRange.startDate : new Date(dateRange.startDate),
    endDate: dateRange.endDate instanceof Date ? dateRange.endDate : new Date(dateRange.endDate),
    key: dateRange.key
  };
  
  const [tempRange, setTempRange] = useState(normalizedDateRange);
  const [isOpen, setIsOpen] = useState(false);

  const handleRangeChange = (ranges: any) => {
    const { startDate, endDate } = ranges.selection;
    setTempRange({ startDate, endDate, key: "selection" });
  };

  const handleApply = () => {
    onDateRangeChange({
      startDate: tempRange.startDate,
      endDate: tempRange.endDate,
    });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setIsOpen(false);
  };

  const handleQuickSelect = (type: 'today' | 'yesterday' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case 'tomorrow':
        startDate = new Date(today);
        startDate.setDate(today.getDate() + 1);
        endDate = new Date(startDate);
        break;
      case 'thisWeek':
        startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
    }

    setTempRange({ startDate, endDate, key: "selection" });
  };

  const formatDateRange = (start: Date, end: Date) => {
    // Ensure we have valid Date objects
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    
    if (isSameDay) {
      if (isToday(startDate)) {
        return "Today";
      } else if (isYesterday(startDate)) {
        return "Yesterday";
      } else if (isTomorrow(startDate)) {
        return "Tomorrow";
      } else {
        return format(startDate, "EEE, d MMM");
      }
    } else {
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="!p-1 font-semibold text-2xl hover:no-underline flex items-center gap-2"
          >
            <Calendar className="w-5 h-5 text-muted-foreground" />
            {formatDateRange(normalizedDateRange.startDate, normalizedDateRange.endDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-background border border-border rounded-lg shadow-lg" 
          align="start"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Select Date Range</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  className="h-8 w-8 p-0"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('today')}
                className="text-xs h-8"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('yesterday')}
                className="text-xs h-8"
              >
                Yesterday
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('tomorrow')}
                className="text-xs h-8"
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisWeek')}
                className="text-xs h-8"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisMonth')}
                className="text-xs h-8"
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisYear')}
                className="text-xs h-8"
              >
                This Year
              </Button>
            </div>
            
            <div className={styles.dateRangeContainer}>
              <DateRange
                ranges={[tempRange]}
                onChange={handleRangeChange}
                moveRangeOnFirstSelection={false}
                months={1}
                direction="horizontal"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 