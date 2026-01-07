interface TaskProgressBarProps {
  completedCount: number;
  inProgressCount: number;
  totalCount: number;
}

export function TaskProgressBar({
  completedCount,
  inProgressCount,
  totalCount,
}: TaskProgressBarProps) {
  const completedPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const inProgressPercent = totalCount > 0 ? (inProgressCount / totalCount) * 100 : 0;

  return (
    <div className="h-2 bg-background rounded-full overflow-hidden flex">
      <div
        className="h-full bg-green-500 transition-all"
        style={{ width: `${completedPercent}%` }}
      />
      <div
        className="h-full bg-blue-500 transition-all"
        style={{ width: `${inProgressPercent}%` }}
      />
    </div>
  );
}
