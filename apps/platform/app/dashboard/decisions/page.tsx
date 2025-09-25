import { Suspense } from 'react';
import DecisionsClient from './decisions-client';
import PlatformShell from "@/components/platform-shell";
import { Skeleton, SkeletonRow } from "@governs-ai/ui";

export default function DecisionsPage() {
  return (
    <PlatformShell>
      <Suspense fallback={
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      }>
        <DecisionsClient />
      </Suspense>
    </PlatformShell>
  );
}
