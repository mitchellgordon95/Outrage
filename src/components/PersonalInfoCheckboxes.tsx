import React from 'react';

interface DetectedCategories {
  name: boolean;
  email: boolean;
  phone: boolean;
  location: boolean;
  party: boolean;
  demographics: boolean;
  occupation: boolean;
  community_role: boolean;
  why_you_care: boolean;
}

interface PersonalInfoCheckboxesProps {
  detected: DetectedCategories;
  detecting: boolean;
}

const categories = [
  { key: 'name' as keyof DetectedCategories, label: 'Name' },
  { key: 'email' as keyof DetectedCategories, label: 'Email' },
  { key: 'phone' as keyof DetectedCategories, label: 'Phone' },
  { key: 'location' as keyof DetectedCategories, label: 'Location' },
  { key: 'party' as keyof DetectedCategories, label: 'Party' },
  { key: 'demographics' as keyof DetectedCategories, label: 'Demographics' },
  { key: 'occupation' as keyof DetectedCategories, label: 'Occupation' },
  { key: 'community_role' as keyof DetectedCategories, label: 'Community Role' },
  { key: 'why_you_care' as keyof DetectedCategories, label: 'Why You Care' },
];

export default function PersonalInfoCheckboxes({ detected, detecting }: PersonalInfoCheckboxesProps) {
  return (
    <div className="mb-3 relative">
      {/* Loading overlay */}
      {detecting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded flex items-center justify-center">
          <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Badge-style checkboxes in flex row */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(({ key, label }) => {
          const isDetected = detected[key];
          return (
            <div
              key={key}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                isDetected
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {/* Checkbox icon */}
              <div className={`flex-shrink-0 h-3 w-3 rounded-full border flex items-center justify-center transition-colors ${
                isDetected
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300'
              }`}>
                {isDetected && (
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span className="whitespace-nowrap">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
