// Campaign-related TypeScript types

export interface Campaign {
  id: number;
  user_id: string | null;
  title: string;
  description: string | null;
  message: string | null;
  demands: any; // JSONB - keeping for backward compatibility
  representatives: any; // JSONB - keeping for backward compatibility
  city: string | null;
  state: string | null;
  location_display: string | null;
  created_at: string;
  updated_at: string;
  message_sent_count: number;
  view_count: number;
}

export interface CampaignCreate {
  title: string;
  message: string;
  city?: string;
  state?: string;
  location_display?: string;
}

export interface CampaignUpdate {
  title?: string;
  message?: string;
}

export interface CampaignStats {
  id: number;
  title: string;
  message_sent_count: number;
  view_count: number;
  created_at: string;
  shareable_url: string;
}

export interface ModerationResult {
  isApproved: boolean;
  concerns: string[];
  severity: 'low' | 'medium' | 'high' | null;
  suggestion: string | null;
}
