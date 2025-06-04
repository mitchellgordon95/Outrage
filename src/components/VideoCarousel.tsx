'use client';

import { useState, useRef, useEffect } from 'react';
import VideoModal from './VideoModal';

interface VideoDemand {
  id: string;
  text: string;
}

interface Video {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail?: string;
  demands: VideoDemand[];
}

interface VideoCarouselProps {
  title: string;
  videos: Video[];
  onSelectDemand: (demand: string) => void;
  selectedDemands: string[];
}

export default function VideoCarousel({ title, videos, onSelectDemand, selectedDemands }: VideoCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [videos]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!videos || videos.length === 0) return null;

  return (
    <>
      <div className="mb-6 relative group">
        <h3 className="text-lg font-medium text-gray-700 mb-3">{title}</h3>
        
        <div className="relative">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-100"
              aria-label="Scroll left"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-100"
              aria-label="Scroll right"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {videos.map((video) => {
              const selectedCount = video.demands.filter(d => selectedDemands.includes(d.text)).length;
              return (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="flex-shrink-0 w-80 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 overflow-hidden"
                >
                  {/* Video Thumbnail */}
                  <div className="aspect-video bg-gray-200 relative">
                    <img 
                      src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black bg-opacity-60 rounded-full p-3">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-800 line-clamp-2 text-left mb-2">
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCount > 0 
                          ? 'bg-primary text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedCount > 0 
                          ? `${selectedCount} selected` 
                          : `${video.demands.length} issues`
                        }
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoId={selectedVideo.videoId}
          videoTitle={selectedVideo.title}
          channelTitle={selectedVideo.channelTitle}
          demands={selectedVideo.demands}
          selectedDemands={selectedDemands}
          onSelectDemand={onSelectDemand}
        />
      )}
    </>
  );
}