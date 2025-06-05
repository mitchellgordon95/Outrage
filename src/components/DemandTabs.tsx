'use client';

interface DemandTabsProps {
  activeTab: 'browse' | 'manual';
  onTabChange: (tab: 'browse' | 'manual') => void;
}

export default function DemandTabs({ activeTab, onTabChange }: DemandTabsProps) {
  return (
    <div className="flex mb-6">
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onTabChange('browse')}
          className={`px-4 py-2 text-sm font-medium border ${
            activeTab === 'browse'
              ? 'bg-primary text-white border-primary z-10'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          } rounded-l-lg focus:z-10 focus:ring-2 focus:ring-primary`}
        >
          Browse Existing
        </button>
        <button
          type="button"
          onClick={() => onTabChange('manual')}
          className={`px-4 py-2 text-sm font-medium border ${
            activeTab === 'manual'
              ? 'bg-primary text-white border-primary z-10'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          } rounded-r-lg focus:z-10 focus:ring-2 focus:ring-primary`}
        >
          Manually Edit
        </button>
      </div>
    </div>
  );
}