// Basic representative data structure
export interface Representative {
  name: string;
  office: string;
  party?: string;
  photoUrl?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
  level: 'country' | 'state' | 'local';
}

// Mock data for fallback
const MOCK_REPRESENTATIVES: Representative[] = [
  {
    name: 'Joe Biden',
    office: 'President of the United States',
    party: 'Democratic Party',
    emails: ['president@whitehouse.gov'],
    phones: ['(202) 456-1111'],
    urls: ['https://www.whitehouse.gov/contact/'],
    level: 'country'
  },
  {
    name: 'Kamala Harris',
    office: 'Vice President of the United States',
    party: 'Democratic Party',
    emails: ['vice.president@whitehouse.gov'],
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