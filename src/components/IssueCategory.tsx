'use client';

import { useState } from 'react';

interface IssueCategoryProps {
  title: string;
  category: string;
  previewIssues: string[];
  moreIssues: string[];
  bgColorClass: string;
  borderColorClass: string;
  textColorClass: string;
  hoverColorClass: string;
  demands: string[];
  onIssueClick: (issue: string) => void;
}

export default function IssueCategory({
  title,
  category,
  previewIssues,
  moreIssues,
  bgColorClass,
  borderColorClass,
  textColorClass,
  hoverColorClass,
  demands,
  onIssueClick
}: IssueCategoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(true);
  
  const handleExpand = () => {
    setExpanded(true);
    setShowExpandButton(false);
  };
  
  const buttonClasses = `px-2 py-1 ${bgColorClass} ${borderColorClass} rounded ${textColorClass} text-xs ${hoverColorClass}`;
  
  return (
    <div className="mb-6">
      <h3 className="font-medium text-gray-700 mb-2">{title}</h3>
      
      {/* Always show the preview issues */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {previewIssues.map((issue, index) => (
          <button
            key={`preview-${index}`}
            onClick={() => onIssueClick(issue)}
            className={`${buttonClasses} ${demands.includes(issue) ? 'opacity-50' : ''}`}
          >
            {issue}
          </button>
        ))}
        
        {/* Expand button */}
        {showExpandButton && moreIssues.length > 0 && (
          <button
            onClick={handleExpand}
            className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 text-xs hover:bg-gray-200"
          >
            See More ▼
          </button>
        )}
      </div>
      
      {/* Show more issues when expanded */}
      {expanded && (
        <div className="flex flex-wrap gap-1.5">
          {moreIssues.map((issue, index) => (
            <button
              key={`more-${index}`}
              onClick={() => onIssueClick(issue)}
              className={`${buttonClasses} ${demands.includes(issue) ? 'opacity-50' : ''}`}
            >
              {issue}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}