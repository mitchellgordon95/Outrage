// Contact type definition
export type ContactType = 'email' | 'webform' | 'facebook' | 'twitter' | 'instagram';

// Contact data structure
export interface Contact {
  type: ContactType;
  value: string;
  description?: string;
}

// Basic representative data structure
export interface Representative {
  id?: string;         // Unique identifier for the representative (from Cicero API's 'sk' field if available)
  name: string;
  office: string;
  party?: string;
  photoUrl?: string;
  phones?: string[];
  contacts: Contact[];
  urls?: string[];
  level: 'country' | 'state' | 'local';
}

// Mock data for fallback
const MOCK_REPRESENTATIVES: Representative[] = [
  {
    id: 'president-biden',
    name: 'Joe Biden',
    office: 'President of the United States',
    party: 'Democratic Party',
    contacts: [
      { type: 'email', value: 'president@whitehouse.gov' },
      { type: 'webform', value: 'https://www.whitehouse.gov/contact/' }
    ],
    phones: ['(202) 456-1111'],
    urls: ['https://www.whitehouse.gov/contact/'],
    level: 'country'
  },
  {
    id: 'vice-president-harris',
    name: 'Kamala Harris',
    office: 'Vice President of the United States',
    party: 'Democratic Party',
    contacts: [
      { type: 'email', value: 'vice.president@whitehouse.gov' }
    ],
    phones: ['(202) 456-1111'],
    urls: ['https://www.whitehouse.gov/contact/'],
    level: 'country'
  }
];

/**
 * Fetch representatives by address using Cicero API
 */
export async function getRepresentativesByAddress(address: string): Promise<Representative[]> {
  try {
    // Call our own API endpoint
    const response = await fetch('/api/lookup-representatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    
    // Handle errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    // Parse response
    const data = await response.json();
    
    return data.representatives;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
}