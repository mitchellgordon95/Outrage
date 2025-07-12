'use client';

import DemandCarousel from './DemandCarousel';
import VideoCarousel from './VideoCarousel';
import LocalCampaignsCarousel from './LocalCampaignsCarousel';
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Yet!</h3>
          <p className="text-gray-600 mb-6">
            Be the first to raise important issues in your community.
          </p>
          {onSwitchToManual && (
            <button
              onClick={onSwitchToManual}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
            >
              Add Your Own
              <span className="ml-2">→</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Local Campaigns Section */}
      {userLocation && (
        <LocalCampaignsCarousel 
          userLocation={userLocation} 
          onSwitchToManual={onSwitchToManual}
        />
      )}
      
      {/* Other Categories */}
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