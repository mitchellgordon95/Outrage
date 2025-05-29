// Navigation utility for consistent routing based on progress

// Interface for draft data
export interface DraftData {
  demands?: string[];
  personalInfo?: string;
  selectedReps?: number[];
  representatives?: any[];
  personalInfoCompleted?: boolean;
  selectionSummary?: string;
  selectionExplanations?: Record<string, string>;
}

// Interface for progress state
export interface ProgressState {
  demands: boolean;
  representatives: boolean;
  personalInfo: boolean;
}

/**
 * Determines the progress state based on draft data
 */
export function getProgressState(draftData: DraftData | null): ProgressState {
  if (!draftData) {
    return {
      demands: false,
      representatives: false,
      personalInfo: false
    };
  }

  return {
    demands: !!(draftData.demands && Array.isArray(draftData.demands) && draftData.demands.some(d => d && d.trim())),
    representatives: !!(draftData.selectedReps && Array.isArray(draftData.selectedReps) && draftData.selectedReps.length > 0),
    personalInfo: !!draftData.personalInfoCompleted
  };
}

/**
 * Determines the next page based on current progress
 */
export function getNextPageFromProgress(progress: ProgressState): string {
  if (progress.personalInfo) {
    return '/draft-preview';
  } else if (progress.representatives) {
    return '/personal-info';
  } else if (progress.demands) {
    return '/pick-representatives';
  } else {
    return '/demands';
  }
}

/**
 * Checks if draft data contains substantial progress
 */
export function hasSubstantialProgress(draftData: DraftData | null): boolean {
  if (!draftData) return false;
  
  const progress = getProgressState(draftData);
  return progress.demands || progress.representatives || progress.personalInfo;
}

/**
 * Parse draft data safely
 */
export function parseDraftData(): DraftData | null {
  try {
    const draftDataRaw = localStorage.getItem('draftData');
    if (!draftDataRaw) return null;
    
    return JSON.parse(draftDataRaw) as DraftData;
  } catch (error) {
    console.error('Error parsing draft data:', error);
    return null;
  }
}

/**
 * Save draft data to localStorage
 */
export function saveDraftData(draftData: DraftData): void {
  localStorage.setItem('draftData', JSON.stringify(draftData));
}

/**
 * Clear draft data from localStorage
 */
export function clearDraftData(): void {
  localStorage.removeItem('draftData');
}