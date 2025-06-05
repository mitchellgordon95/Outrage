'use client';

interface SelectedDemandsSummaryProps {
  demands: string[];
}

export default function SelectedDemandsSummary({ demands }: SelectedDemandsSummaryProps) {
  if (demands.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Selected Demands ({demands.length}):</h3>
      <div className="space-y-1">
        {demands.map((demand, index) => (
          <div key={index} className="text-sm text-gray-600 flex items-start">
            <span className="mr-2">•</span>
            <span>{demand}</span>
          </div>
        ))}
      </div>
    </div>
  );
}