/**
 * Interfaces for CSV data structures
 */

// Represents a row in the representatives CSV file
export interface RepresentativeCSVRow {
  // Basic information
  name: string;
  office: string;
  level: string; // 'country', 'state', or 'local'
  party?: string;
  
  // Contact information
  email?: string;
  phone?: string;
  website?: string;
  
  // Location information
  state?: string;
  state_code?: string;
  district?: string;
  county?: string;
  city?: string;
  
  // Social media
  twitter?: string;
  facebook?: string;
  instagram?: string;
  
  // Governance Project specific fields
  notes?: string;
  last_updated?: string;
}

// Helper conversion functions
export function csvRowToRepresentative(row: RepresentativeCSVRow) {
  return {
    name: row.name,
    office: row.office,
    party: row.party,
    emails: row.email ? [row.email] : [],
    phones: row.phone ? [row.phone] : [],
    urls: row.website ? [row.website] : [],
    level: row.level as 'country' | 'state' | 'local',
    channels: [
      ...(row.twitter ? [{ type: 'Twitter', id: row.twitter }] : []),
      ...(row.facebook ? [{ type: 'Facebook', id: row.facebook }] : []),
      ...(row.instagram ? [{ type: 'Instagram', id: row.instagram }] : []),
    ],
  };
}