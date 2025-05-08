import { NextRequest, NextResponse } from 'next/server';
import { Representative } from '@/services/representatives';

export async function POST(request: NextRequest) {
  try {
    // Get address from request
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    
    // Get API key from environment variables
    const apiKey = process.env.CICERO_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }
    
    // Call Cicero API with max parameter to get up to 200 officials
    const url = `https://app.cicerodata.com/v3.1/official?search_loc=${encodeURIComponent(address)}&format=json&max=200&key=${apiKey}`;
    
    // Log a simple message about the API call
    console.log(`Looking up representatives for address: ${address.substring(0, 30)}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`API error: ${response.status}`);
      return NextResponse.json({ 
        error: `API error: ${response.status}`
      }, { status: response.status });
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
      return NextResponse.json({ representatives: [] });
    }
    
    // Transform officials to our format
    const representatives: Representative[] = [];
    
    if (officials.length > 0) {
      for (const official of officials) {
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
        let officeTitle = official.office?.title || 
                        official.office?.chamber?.name || 
                        'Unknown';
        
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
        
        representatives.push({
          name,
          office: officeTitle,
          party: official.party,
          photoUrl: official.photo_origin_url,
          phones,
          emails: official.email_addresses || [],
          urls: official.urls || [],
          level
        });
      }
    }
    
    return NextResponse.json({ representatives });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch representatives' }, { status: 500 });
  }
}