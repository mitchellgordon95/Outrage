'use client';

import DemandCarousel from './DemandCarousel';
import VideoCarousel from './VideoCarousel';

interface DemandsBrowseTabProps {
  categories: any[];
  categoriesLoading: boolean;
  demands: string[];
  onSelectDemand: (demand: string) => void;
}

export default function DemandsBrowseTab({
  categories,
  categoriesLoading,
  demands,
  onSelectDemand
}: DemandsBrowseTabProps) {
  if (categoriesLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No issues available at the moment. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map(category => {
        if (category.type === 'youtube_channel' && category.videos) {
          return (
            <VideoCarousel
              key={category.id}
              title={category.title}
              videos={category.videos}
              onSelectDemand={onSelectDemand}
              selectedDemands={demands}
            />
          );
        } else if (category.demands) {
          return (
            <DemandCarousel
              key={category.id}
              title={category.title}
              demands={category.demands}
              onSelectDemand={onSelectDemand}
              selectedDemands={demands}
            />
          );
        }
        return null;
      })}
    </div>
  );
}