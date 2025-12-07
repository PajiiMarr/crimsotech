import { useState, useEffect } from 'react';
import { Calendar, CalendarRange, ChevronDown, Filter } from 'lucide-react';
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
import { Label } from '~/components/ui/label';
import { format, subDays, subMonths, subYears, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';

interface DateRangeFilterProps {
  onDateRangeChange: (range: { start: Date; end: Date; rangeType: string }) => void;
  isLoading?: boolean;
}

export default function DateRangeFilter({ onDateRangeChange, isLoading = false }: DateRangeFilterProps) {
  const [dateRange, setDateRange] = useState<{
    start: Date;
    end: Date;
    rangeType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  }>({
    start: subDays(new Date(), 7),
    end: new Date(),
    rangeType: 'weekly',
  });

  // Handle initial date range change
  useEffect(() => {
    onDateRangeChange(dateRange);
  }, []); // Only run once on mount

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
        start = subDays(now, 7);
    }
    
    const newRange = {
      start,
      end: now,
      rangeType,
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

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year);
    const start = startOfYear(new Date(yearNum, 0, 1));
    const end = endOfYear(new Date(yearNum, 0, 1));
    
    handleCustomRangeSelect(start, end);
  };

  const handleMonthChange = (month: string) => {
    const [year, monthNum] = month.split('-').map(Number);
    const start = startOfMonth(new Date(year, monthNum - 1, 1));
    const end = endOfMonth(new Date(year, monthNum - 1, 1));
    
    handleCustomRangeSelect(start, end);
  };

  // Generate year options (current year and previous 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // Generate month options for current and previous year
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const label = format(date, 'MMM yyyy');
    return { value, label };
  });

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Date Range</h3>
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
              >
                Today
              </Button>
              <Button
                type="button"
                variant={dateRange.rangeType === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('weekly')}
                disabled={isLoading}
              >
                7 Days
              </Button>
              <Button
                type="button"
                variant={dateRange.rangeType === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('monthly')}
                disabled={isLoading}
              >
                1 Month
              </Button>
              <Button
                type="button"
                variant={dateRange.rangeType === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect('yearly')}
                disabled={isLoading}
              >
                1 Year
              </Button>
            </div>

            {/* Month Selector */}
            <Select
              value={dateRange.rangeType === 'custom' ? undefined : ''}
              onValueChange={handleMonthChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select
              value={dateRange.rangeType === 'custom' ? undefined : ''}
              onValueChange={handleYearChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Range Calendar */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  disabled={isLoading}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3">
                  <Label>Custom Date Range</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.start, to: dateRange.end }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          handleCustomRangeSelect(range.from, range.to);
                        }
                      }}
                      disabled={isLoading}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <p>Selected: {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Active Filter Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="capitalize">{dateRange.rangeType} view</span>
            </div>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="mt-4 text-center md:text-left">
          <p className="text-sm">
            Showing data from{' '}
            <span className="font-semibold">
              {format(dateRange.start, 'MMM dd, yyyy')}
            </span>{' '}
            to{' '}
            <span className="font-semibold">
              {format(dateRange.end, 'MMM dd, yyyy')}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}