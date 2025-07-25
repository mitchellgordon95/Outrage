import { NextRequest, NextResponse } from 'next/server';
import { Representative, Contact, ContactType } from '@/services/representatives';
import { unstable_cache } from 'next/cache';

// Cicero API identifier interface
interface CiceroIdentifier {
  identifier_type: string;
  identifier_value: string;
  id?: number;
}

// Interface for Cicero API officials
interface CiceroOfficial {
  sk?: string;
  preferred_name?: string;
  first_name?: string;
  last_name?: string;
  party?: string;
  photo_origin_url?: string;
  urls?: string[];
  email_addresses?: string[];
  web_form_url?: string;
  valid_from?: string;
  valid_to?: string;
  addresses?: Array<{
    phone?: string;
  }>;
  office?: {
    title?: string;
    district?: {
      district_type?: string;
    };
    chamber?: {
      name?: string;
      type?: string;
    };
    representing_city?: string;
    representing_state?: string;
  };
  identifiers?: CiceroIdentifier[];
}

// Normalize address for cache key (lowercase, trim, remove extra spaces)
function normalizeAddress(address: string): string {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Core function to fetch representatives from Cicero API
async function fetchRepresentativesFromCicero(address: string): Promise<Representative[]> {
  const apiKey = process.env.CICERO_API_KEY;
  
  if (!apiKey) {
    throw new Error('API key missing');
  }
    
  // Call Cicero API with max parameter to get up to 200 officials
  const url = `https://app.cicerodata.com/v3.1/official?search_loc=${encodeURIComponent(address)}&format=json&max=200&key=${apiKey}`;
  
  // Log a simple message about the API call
  console.log(`[CACHE MISS] Looking up representatives for address: ${address.substring(0, 30)}...`);
    
  const response = await fetch(url);
  
  if (!response.ok) {
    console.log(`API error: ${response.status}`);
    throw new Error(`API error: ${response.status}`);
  }
    
  // Parse the response
  const data = await response.json();
  
  // Log a simple message about the response
  const candidateCount = data.response?.results?.candidates?.length || 0;
  console.log(`Found ${candidateCount} location candidates in response`);
  
  // Initialize empty officials array
  let officials = [];
  
  // Check for location candidates (each candidate has its own officials)
  if (data.response?.results?.candidates && data.response.results.candidates.length > 0) {
    // Use the first candidate's officials
    const firstCandidate = data.response.results.candidates[0];
    
    if (firstCandidate.officials && Array.isArray(firstCandidate.officials)) {
      officials = firstCandidate.officials;
      console.log(`Found ${officials.length} officials for address`);
    } else {
      console.log('No officials found for the matched address');
    }
  } else if (data.response?.results?.officials) {
    // Direct officials array (unlikely based on your results)
    officials = data.response.results.officials;
    console.log(`Found ${officials.length} officials for address`);
  } else {
    console.log('No officials found for the provided address');
    return [];
  }
    
    // Filter officials to only include those currently in office
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const currentOfficials = officials.filter((official: any) => {
      // Check valid_from date (must be in the past or today)
      const validFrom = official.valid_from ? 
        new Date(official.valid_from.split(' ')[0]).toISOString().split('T')[0] : null;
      
      // Check valid_to date (must be in the future or null/undefined)
      const validTo = official.valid_to && official.valid_to !== 'null' ? 
        new Date(official.valid_to.split(' ')[0]).toISOString().split('T')[0] : null;
      
      // Official is current if:
      // 1. They have started their term (valid_from is in the past or today)
      // 2. Their term hasn't ended (valid_to is in the future or null/undefined)
      const hasStarted = validFrom ? validFrom <= currentDate : true;
      const hasNotEnded = validTo ? validTo > currentDate : true;
      
      return hasStarted && hasNotEnded;
    });
    
    console.log(`Filtered to ${currentOfficials.length} currently active officials`);
    
    // Use the filtered officials
    officials = currentOfficials;
    
    // Transform officials to our format
    const representatives: Representative[] = [];
    
    if (officials.length > 0) {
      for (const official of officials as CiceroOfficial[]) {
        let level: 'country' | 'state' | 'local' = 'local';
        
        // More accurate detection of level based on district_type and chamber type
        if (official.office?.district?.district_type?.includes('NATIONAL') || 
            official.office?.chamber?.type?.includes('NATIONAL') ||
            (official.office?.title?.toLowerCase().includes('president'))) {
          level = 'country';
        } else if (official.office?.district?.district_type?.includes('STATE') || 
                  official.office?.chamber?.type?.includes('STATE') ||
                  (official.office?.representing_state && !official.office?.representing_city)) {
          level = 'state';
        } else if (official.office?.district?.district_type?.includes('LOCAL') ||
                  official.office?.representing_city) {
          level = 'local';
        }
        
        // Build a simple name
        const name = [
          official.preferred_name || official.first_name,
          official.last_name
        ].filter(Boolean).join(' ');
        
        // Extract phone from addresses
        const phones: string[] = [];
        if (official.addresses) {
          for (const addr of official.addresses) {
            if (addr.phone) phones.push(addr.phone);
          }
        }
        
        // No more detailed logging needed
        
        // Get the office title using the correct properties from the API
        const rawOfficeTitle = official.office?.title || 
                             official.office?.chamber?.name || 
                             'Unknown';
        
        // Log to debug the title issue
        if (rawOfficeTitle.toLowerCase().includes('senator')) {
          console.log(`Senator detected - Name: ${name}, Raw title: ${rawOfficeTitle}, Level: ${level}, Chamber type: ${official.office?.chamber?.type}, District type: ${official.office?.district?.district_type}`);
        }
        
        // For senators and representatives, clarify if they're state or federal
        let officeTitle = rawOfficeTitle;
        const titleLower = rawOfficeTitle.toLowerCase();
        
        if (titleLower === 'senator') {
          if (level === 'country') {
            officeTitle = 'U.S. Senator';
          } else if (level === 'state') {
            officeTitle = 'State Senator';
          }
        } else if (titleLower === 'representative' || titleLower === 'assembly member' || titleLower === 'assemblymember') {
          if (level === 'country') {
            officeTitle = 'U.S. Representative';
          } else if (level === 'state') {
            officeTitle = `State ${rawOfficeTitle}`;
          }
        }
        
        // Add location information to the title
        const city = official.office?.representing_city;
        const state = official.office?.representing_state;
        
        if (city && state) {
          officeTitle = `${officeTitle} of ${city}, ${state}`;
        } else if (city) {
          officeTitle = `${officeTitle} of ${city}`;
        } else if (state) {
          officeTitle = `${officeTitle} of ${state}`;
        }
        
        // Build contacts array from email addresses, web form URL, and social media
        const contacts: Contact[] = [];
        
        // Add email contacts
        if (official.email_addresses && official.email_addresses.length > 0) {
          for (const email of official.email_addresses) {
            contacts.push({
              type: 'email' as ContactType,
              value: email
            });
          }
        }
        
        // Add web form contact if available
        if (official.web_form_url) {
          contacts.push({
            type: 'webform' as ContactType,
            value: official.web_form_url,
            description: 'Web Form'
          });
        }
        
        // Add social media contacts from identifiers
        /* Commenting out social media identifier code
        if (official.identifiers && official.identifiers.length > 0) {
          for (const identifier of official.identifiers) {
            let contactType: ContactType | null = null;
            let value = identifier.identifier_value;
            let description: string | undefined;

            // Process based on identifier type
            if (identifier.identifier_type === 'TWITTER') {
              contactType = 'twitter';
              // Clean up value if needed (add @ if missing, or extract handle from URL)
              if (!value.startsWith('@') && !value.includes('/')) {
                value = '@' + value;
              } else if (value.includes('twitter.com/')) {
                const handle = value.split('twitter.com/').pop();
                if (handle) value = '@' + handle.replace(/\/$/, '');
              }
              description = 'Twitter';
            } else if (identifier.identifier_type === 'FACEBOOK' ||
                       identifier.identifier_type === 'FACEBOOK-OFFICIAL') {
              // Exclude FACEBOOK-CAMPAIGN
              contactType = 'facebook';
              if (!value.startsWith('http')) {
                value = 'https://www.facebook.com/' + value;
              }
              description = identifier.identifier_type === 'FACEBOOK-OFFICIAL' ? 'Facebook (Official)' : 'Facebook';
            } else if (identifier.identifier_type === 'INSTAGRAM') {
              // Exclude INSTAGRAM-CAMPAIGN
              contactType = 'instagram';
              if (!value.startsWith('http') && !value.startsWith('@')) {
                value = '@' + value;
              }
              description = 'Instagram';
            }

            // Add to contacts if valid type was determined
            if (contactType) {
              contacts.push({
                type: contactType,
                value,
                description
              });
            }
          }
        }
        */
        
        representatives.push({
          id: official.sk || `${official.first_name}-${official.last_name}-${officeTitle}`.replace(/\s+/g, '-').toLowerCase(),
          name,
          office: officeTitle,
          party: official.party,
          photoUrl: official.photo_origin_url,
          phones,
          contacts,
          urls: official.urls || [],
          level
        });
      }
    }
    
  return representatives;
}

// Cached version of the fetch function
// Cache for 24 hours (86400 seconds) since representatives rarely change
const getCachedRepresentatives = unstable_cache(
  async (normalizedAddress: string) => {
    console.log(`[CACHE] Fetching representatives for: ${normalizedAddress.substring(0, 30)}...`);
    return fetchRepresentativesFromCicero(normalizedAddress);
  },
  ['representatives'], // cache key prefix
  {
    revalidate: 86400, // 24 hours in seconds
    tags: ['representatives'] // allows manual cache invalidation if needed
  }
);

export async function POST(request: NextRequest) {
  try {
    // Get address from request
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    
    // Normalize address for consistent caching
    const normalizedAddress = normalizeAddress(address);
    
    try {
      // Try to get cached representatives
      const representatives = await getCachedRepresentatives(normalizedAddress);
      
      // Add cache hit indicator to response headers
      const response = NextResponse.json({ representatives });
      response.headers.set('X-Cache-Status', 'HIT');
      
      return response;
    } catch (error) {
      // If cache fetch fails, return error
      console.error('Error fetching representatives:', error);
      return NextResponse.json({ error: 'Failed to fetch representatives' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch representatives' }, { status: 500 });
  }
}