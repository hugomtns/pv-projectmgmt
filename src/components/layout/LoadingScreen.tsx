export function LoadingScreen() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-border bg-card p-6">
        <div className="mb-8">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-64 bg-muted rounded animate-pulse" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
