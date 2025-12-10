import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Calendar as CalendarComponent } from '~/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DateRangeFilterProps {
  onDateRangeChange: (range: { start: Date; end: Date; rangeType: string }) => void;
  isLoading?: boolean;
}

export default function DateRangeFilter({ onDateRangeChange, isLoading = false }: DateRangeFilterProps) {
  // Changed default from 'weekly' to 'monthly' and start date to 1 month ago
  const [dateRange, setDateRange] = useState<{
    start: Date;
    end: Date;
    rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'specific_month' | 'specific_year' | 'custom';
  }>({
    start: subMonths(new Date(), 1), // Changed from subDays(new Date(), 7)
    end: new Date(),
    rangeType: 'monthly', // Changed from 'weekly'
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));

  // Handle initial date range change
  useEffect(() => {
    onDateRangeChange(dateRange);
  }, []);

  const handleQuickSelect = (rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const now = new Date();
    let start: Date;
    
    switch (rangeType) {
      case 'daily':
        start = subDays(now, 1);
        break;
      case 'weekly':
        start = subDays(now, 7);
        break;
      case 'monthly':
        start = subMonths(now, 1);
        break;
      case 'yearly':
        start = subYears(now, 1);
        break;
      default:
        start = subMonths(now, 1); // Changed default to 1 month
    }
    
    const newRange = {
      start,
      end: now,
      rangeType,
    };
    
    setDateRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleMonthSelect = (monthValue: string) => {
    setSelectedMonth(monthValue);
    const [year, month] = monthValue.split('-').map(Number);
    const date = new Date(year, month - 1);
    
    const newRange = {
      start: startOfMonth(date),
      end: endOfMonth(date),
      rangeType: 'specific_month' as const,
    };
    
    setDateRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleYearSelect = (yearValue: string) => {
    setSelectedYear(yearValue);
    const year = parseInt(yearValue);
    const date = new Date(year, 0);
    
    const newRange = {
      start: startOfYear(date),
      end: endOfYear(date),
      rangeType: 'specific_year' as const,
    };
    
    setDateRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleCustomRangeSelect = (start: Date, end: Date) => {
    const newRange = {
      start,
      end,
      rangeType: 'custom' as const,
    };
    
    setDateRange(newRange);
    onDateRangeChange(newRange);
  };

  // Generate month options for the last 24 months
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = subMonths(now, i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  };

  // Generate year options for the last 5 years
  const generateYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      options.push({ value: year.toString(), label: year.toString() });
    }
    return options;
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Date Display */}
        <div className="text-sm">
          <span className="text-muted-foreground">Showing: </span>
          <span className="font-medium">
            {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={dateRange.rangeType === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickSelect('daily')}
              disabled={isLoading}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              type="button"
              variant={dateRange.rangeType === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickSelect('weekly')}
              disabled={isLoading}
              className="text-xs"
            >
              7D
            </Button>
            <Button
              type="button"
              variant={dateRange.rangeType === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickSelect('monthly')}
              disabled={isLoading}
              className="text-xs"
            >
              1M
            </Button>
            <Button
              type="button"
              variant={dateRange.rangeType === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickSelect('yearly')}
              disabled={isLoading}
              className="text-xs"
            >
              1Y
            </Button>
          </div>

          {/* Month Selector */}
          <Select 
            value={selectedMonth} 
            onValueChange={handleMonthSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select 
            value={selectedYear} 
            onValueChange={handleYearSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {generateYearOptions().map(option => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                disabled={isLoading}
                className="text-xs"
              >
                <Calendar className="w-3 h-3 mr-1" />
                Custom
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4">
                <h4 className="font-medium mb-3">Select Date Range</h4>
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.start, to: dateRange.end }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      handleCustomRangeSelect(range.from, range.to);
                    }
                  }}
                  disabled={isLoading}
                  className="border-0"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}