'use client';

import { useEffect } from 'react';

interface Demand {
  id: string;
  text: string;
}

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  demands: Demand[];
  selectedDemands: string[];
  onSelectDemand: (demandText: string) => void;
}

export default function VideoModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
  channelTitle,
  demands,
  selectedDemands,
  onSelectDemand
}: VideoModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold pr-8">{videoTitle}</h2>
          <p className="text-gray-600 mt-1">by {channelTitle}</p>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* YouTube Embed */}
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={videoTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          
          {/* Demands Section */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Political Issues from This Video ({demands.length})
            </h3>
            
            {demands.length > 0 ? (
              <div className="space-y-3">
                {demands.map((demand) => {
                  const isSelected = selectedDemands.includes(demand.text);
                  return (
                    <button
                      key={demand.id}
                      onClick={() => onSelectDemand(demand.text)}
                      className={`
                        w-full p-4 rounded-lg border text-left transition-all duration-200
                        ${isSelected 
                          ? 'border-primary bg-primary text-white' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                          {demand.text}
                        </p>
                        <span className={`ml-2 ${isSelected ? 'text-white' : 'text-primary'}`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No demands found for this video.</p>
            )}
            
            {/* Action hint */}
            <p className="text-sm text-gray-500 mt-4">
              Click on any issue above to add it to your demands list
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}