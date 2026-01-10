import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  viewMode: 'month' | 'quarter' | 'year';
  onRangeChange: (start: Date, end: Date) => void;
  onViewModeChange: (mode: 'month' | 'quarter' | 'year') => void;
}

export function TimelineHeader({
  rangeStart,
  rangeEnd,
  viewMode,
  onRangeChange,
}: TimelineHeaderProps) {

  const handlePrevious = () => {
    if (viewMode === 'month') {
      const newStart = addMonths(rangeStart, -1);
      const newEnd = addMonths(rangeEnd, -1);
      onRangeChange(newStart, newEnd);
    } else if (viewMode === 'quarter') {
      const newStart = addMonths(rangeStart, -3);
      const newEnd = addMonths(rangeEnd, -3);
      onRangeChange(newStart, newEnd);
    } else {
      const newStart = addYears(rangeStart, -1);
      const newEnd = addYears(rangeEnd, -1);
      onRangeChange(newStart, newEnd);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const newStart = addMonths(rangeStart, 1);
      const newEnd = addMonths(rangeEnd, 1);
      onRangeChange(newStart, newEnd);
    } else if (viewMode === 'quarter') {
      const newStart = addMonths(rangeStart, 3);
      const newEnd = addMonths(rangeEnd, 3);
      onRangeChange(newStart, newEnd);
    } else {
      const newStart = addYears(rangeStart, 1);
      const newEnd = addYears(rangeEnd, 1);
      onRangeChange(newStart, newEnd);
    }
  };

  const handleToday = () => {
    const today = new Date();
    if (viewMode === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onRangeChange(start, end);
    } else if (viewMode === 'quarter') {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), quarterStart, 1);
      const end = new Date(today.getFullYear(), quarterStart + 3, 0);
      onRangeChange(start, end);
    } else {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      onRangeChange(start, end);
    }
  };

  const formatRange = () => {
    if (viewMode === 'month') {
      return format(rangeStart, 'MMMM yyyy');
    } else if (viewMode === 'quarter') {
      const quarter = Math.floor(rangeStart.getMonth() / 3) + 1;
      return `Q${quarter} ${format(rangeStart, 'yyyy')}`;
    } else {
      return format(rangeStart, 'yyyy');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 font-medium">{formatRange()}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-500" />
            <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-purple-500" />
            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-500" />
          </div>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-500" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
