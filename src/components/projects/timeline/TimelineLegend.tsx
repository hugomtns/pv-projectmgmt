import { format, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, differenceInDays } from 'date-fns';

interface TimelineLegendProps {
  rangeStart: Date;
  rangeEnd: Date;
  viewMode: 'month' | 'quarter' | 'year';
}

export function TimelineLegend({ rangeStart, rangeEnd, viewMode }: TimelineLegendProps) {
  const today = new Date();
  const totalDays = differenceInDays(rangeEnd, rangeStart);

  // Calculate today indicator position
  const todayPosition = differenceInDays(today, rangeStart) / totalDays * 100;
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  // Generate date markers based on view mode
  let dateMarkers: { label: string; position: number }[] = [];

  if (viewMode === 'month') {
    // Show days for month view
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    dateMarkers = days.map((day) => ({
      label: format(day, 'd'),
      position: (differenceInDays(day, rangeStart) / totalDays) * 100,
    }));
  } else if (viewMode === 'quarter') {
    // Show weeks for quarter view
    const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd });
    dateMarkers = weeks.map((week) => ({
      label: format(week, 'MMM d'),
      position: (differenceInDays(week, rangeStart) / totalDays) * 100,
    }));
  } else {
    // Show months for year view
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    dateMarkers = months.map((month) => ({
      label: format(month, 'MMM'),
      position: (differenceInDays(month, rangeStart) / totalDays) * 100,
    }));
  }

  return (
    <div className="relative h-10 border-b bg-muted/30">
      {/* Date markers */}
      {dateMarkers.map((marker, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 border-l border-border/40"
          style={{ left: `${marker.position}%` }}
        >
          <span className="absolute top-2 left-1 text-xs text-muted-foreground">
            {marker.label}
          </span>
        </div>
      ))}

      {/* Today indicator */}
      {isTodayVisible && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${todayPosition}%` }}
          title="Today"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      )}
    </div>
  );
}
