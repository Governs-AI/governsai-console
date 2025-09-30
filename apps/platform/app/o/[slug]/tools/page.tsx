import { Suspense } from 'react';
import { ToolsClient } from '@/components/tools-client';

interface ToolsPageProps {
  params: {
    slug: string;
  };
}

export default function ToolsPage({ params }: ToolsPageProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tools...</p>
        </div>
      </div>
    }>
      <ToolsClient orgSlug={params.slug} />
    </Suspense>
  );
}