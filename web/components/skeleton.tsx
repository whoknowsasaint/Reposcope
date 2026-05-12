"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] rounded ${className}`}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-in fade-in duration-200">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full max-w-[600px]" />
        <Skeleton className="h-3 w-full max-w-[500px]" />
        <Skeleton className="h-3 w-3/4 max-w-[400px]" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5">
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function RepoSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
