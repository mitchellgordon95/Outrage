'use client';

import DemandsList from './DemandsList';

interface DemandsManualTabProps {
  demands: string[];
  hasCampaign: boolean;
  editingIndex: number | null;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (index: number) => void;
  onRemoveDemand: (index: number) => void;
  onAddDemand: () => void;
}

export default function DemandsManualTab({
  demands,
  hasCampaign,
  editingIndex,
  editingValue,
  onEditingValueChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onRemoveDemand,
  onAddDemand
}: DemandsManualTabProps) {
  return (
    <>
      <div className="space-y-3 mb-2">
        <DemandsList
          demands={demands}
          hasCampaign={hasCampaign}
          editingIndex={editingIndex}
          editingValue={editingValue}
          onEditingValueChange={onEditingValueChange}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onStartEdit={onStartEdit}
          onRemoveDemand={onRemoveDemand}
        />
      </div>

      {!hasCampaign && (
        <button
          onClick={onAddDemand}
          className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          + Add Custom Demand
        </button>
      )}
    </>
  );
}