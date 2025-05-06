export interface Representative {
  name: string;
  office: string;
  party?: string;
  photoUrl?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
  channels?: {
    type: string;
    id: string;
  }[];
  level: 'country' | 'state' | 'local';
}

// This is a placeholder until we have the actual CSV file
// Will be replaced with real data once the CSV is available
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
  },
  {
    name: 'Chuck Schumer',
    office: 'U.S. Senate Majority Leader',
    party: 'Democratic Party',
    emails: ['senator@schumer.senate.gov'],
    phones: ['(202) 224-6542'],
    urls: ['https://www.schumer.senate.gov/contact/email-chuck'],
    level: 'country'
  },
  {
    name: 'Gavin Newsom',
    office: 'Governor of California',
    party: 'Democratic Party',
    emails: ['governor@governor.ca.gov'],
    phones: ['(916) 445-2841'],
    urls: ['https://govapps.gov.ca.gov/gov40mail/'],
    level: 'state'
  },
  {
    name: 'London Breed',
    office: 'Mayor of San Francisco',
    party: 'Democratic Party',
    emails: ['mayorlondonbreed@sfgov.org'],
    phones: ['(415) 554-6141'],
    urls: ['https://sfmayor.org/contact-mayor-london-breed'],
    level: 'local'
  }
];

/**
 * Filter representatives by address
 * This is a placeholder implementation that will be replaced once we have the CSV data
 * Currently returns a static list of representatives
 */
export async function getRepresentativesByAddress(address: string): Promise<Representative[]> {
  try {
    console.log(`Looking up representatives for address: ${address}`);
    
    // Here we would normally parse the address and lookup in the CSV dataset
    // For now, we'll just return mock data
    
    // In the future, this function will:
    // 1. Parse the address to extract the state, city, zip, etc.
    // 2. Load the CSV data
    // 3. Filter representatives by the user's location
    // 4. Return the matching representatives
    
    // Simulate an async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data
    return MOCK_REPRESENTATIVES;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
}

/**
 * Load representatives from CSV file
 * This will be implemented when the CSV file is available
 */
export async function loadRepresentativesFromCSV(): Promise<Representative[]> {
  // This function will:
  // 1. Load the CSV file
  // 2. Parse the CSV data
  // 3. Convert to Representative objects
  // 4. Return the full dataset
  
  // For now, return mock data
  return MOCK_REPRESENTATIVES;
}