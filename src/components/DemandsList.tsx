'use client';

interface DemandsListProps {
  demands: string[];
  hasCampaign: boolean;
  editingIndex: number | null;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (index: number) => void;
  onRemoveDemand: (index: number) => void;
}

export default function DemandsList({
  demands,
  hasCampaign,
  editingIndex,
  editingValue,
  onEditingValueChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onRemoveDemand
}: DemandsListProps) {
  if (demands.length === 0) {
    return (
      <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-500">No demands added yet. Select issues from categories below or add your own.</p>
      </div>
    );
  }

  return (
    <>
      {demands.map((demand, index) => (
        <div key={index} className={`flex items-center gap-2 ${hasCampaign ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'} border rounded-md p-1`}>
          {editingIndex === index && !hasCampaign ? (
            <>
              <input
                type="text"
                value={editingValue}
                onChange={(e) => onEditingValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveEdit();
                  } else if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
                placeholder="Enter your demand here"
                className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
                autoFocus
              />
              <button
                onClick={onSaveEdit}
                className="p-2 text-green-600 hover:text-green-800"
                title="Save"
              >
                ✓
              </button>
              <button
                onClick={onCancelEdit}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Cancel"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 p-2 font-medium text-gray-800">{demand}</p>
              {!hasCampaign && (
                <>
                  <button
                    onClick={() => onStartEdit(index)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onRemoveDemand(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    ✕
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}