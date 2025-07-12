'use client';

import DemandCarousel from './DemandCarousel';
import VideoCarousel from './VideoCarousel';
import LocalCampaignsCarousel from './LocalCampaignsCarousel';
import PopularCampaignsCarousel from './PopularCampaignsCarousel';
import { LocationInfo } from '@/utils/geocoding';

interface DemandsBrowseTabProps {
  categories: any[];
  categoriesLoading: boolean;
  demands: string[];
  onSelectDemand: (demand: string) => void;
  onSwitchToManual?: () => void;
  userLocation?: LocationInfo | null;
}

export default function DemandsBrowseTab({
  categories,
  categoriesLoading,
  demands,
  onSelectDemand,
  onSwitchToManual,
  userLocation
}: DemandsBrowseTabProps) {
  if (categoriesLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't show empty state if we have campaigns to show
  // The individual carousels will handle their own empty states

  return (
    <div className="space-y-8">
      {/* Local Campaigns Section */}
      {userLocation && (
        <LocalCampaignsCarousel 
          userLocation={userLocation} 
          onSwitchToManual={onSwitchToManual}
        />
      )}
      
      {/* Popular National Campaigns */}
      <PopularCampaignsCarousel onSwitchToManual={onSwitchToManual} />
      
      {/* YouTube Categories */}
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