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

export async function getRepresentativesByAddress(address: string): Promise<Representative[]> {
  try {
    const civicApiKey = process.env.NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.googleapis.com/civicinfo/v2/representatives?key=${civicApiKey}&address=${encodedAddress}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error fetching representatives: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.offices || !data.officials) {
      return [];
    }
    
    // Process the data to match our Representative interface
    const representatives: Representative[] = [];
    
    // Map officials to their offices
    data.offices.forEach((office: any) => {
      const level = determineLevel(office.levels, office.name);
      
      office.officialIndices.forEach((index: number) => {
        const official = data.officials[index];
        
        representatives.push({
          name: official.name,
          office: office.name,
          party: official.party,
          photoUrl: official.photoUrl,
          phones: official.phones,
          emails: official.emails,
          urls: official.urls,
          channels: official.channels,
          level,
        });
      });
    });
    
    return representatives;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
}

function determineLevel(levels: string[], officeName: string): 'country' | 'state' | 'local' {
  if (!levels || levels.length === 0) {
    // Guess based on office name
    if (officeName.includes('President') || officeName.includes('U.S.')) {
      return 'country';
    } else if (officeName.includes('State') || officeName.includes('Governor')) {
      return 'state';
    } else {
      return 'local';
    }
  }
  
  const level = levels[0];
  
  if (level.includes('country')) {
    return 'country';
  } else if (level.includes('administrativeArea1')) {
    return 'state';
  } else {
    return 'local';
  }
}