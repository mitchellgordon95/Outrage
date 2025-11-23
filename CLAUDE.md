# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Outrage" is a website that lets users quickly send emails to their elected representatives in the US about issues they care about. The application is a **single-page experience** with progressive sections:

1. **Address Input** (Section 1):
   - Google Maps autocomplete address field
   - Expands Section 2 once address is submitted

2. **What's On Your Mind** (Section 2):
   - Simple textarea for users to write about issues they care about
   - Expands Section 3 once message is submitted

3. **Your Representatives** (Section 3):
   - Automatically fetches representatives using Cicero API
   - AI auto-selects relevant representatives based on user's message
   - Displays selected representatives with photos, titles, party affiliation, and contact methods
   - No action buttons yet (placeholder for future login/message generation features)

## Development Commands

As the project develops, common commands for building, testing, and linting will be documented here.

## Environment Setup

The project uses environment variables for API keys and configuration:

```
# .env file structure
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CICERO_API_KEY=your_cicero_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**Important**: The `.env` file is included in `.gitignore` to prevent exposing API keys in the repository.

## Architecture and Structure

### Current Implementation

**Single-Page Application** (`/src/app/page.tsx`):
- Progressive 3-section layout with conditional rendering
- Component-level state management (no global state)
- localStorage for persisting address, message, and representative data

**Preserved Components**:
- `ChromeExtensionHelper.tsx` - For future email sending functionality

**API Routes** (`/src/app/api/`):
- `lookup-representatives` - Fetches representatives by address using Cicero API
- `select-representatives` - AI-powered representative selection using Anthropic Claude
- `generate-representative-draft` - Draft generation API (preserved for future use)
- `extension-status` - Chrome extension connectivity check

**External Integrations**:
- Google Maps API for address autocomplete
- Cicero API for representative lookup
- Anthropic Claude API for AI representative selection and draft generation

### Planned Features (Not Yet Implemented)

1. **Login Section** (Section 4):
   - User authentication
   - Profile management

2. **Generate Messages Section** (Section 5):
   - Draft generation using preserved API
   - Email/webform submission via ChromeExtensionHelper
   - Message customization and editing

### Representative Lookup Implementation

Implementing Cicero API for representative lookup based on comprehensive evaluation of available options:

- **Chosen Solution**: Cicero API
  - Robust and comprehensive coverage of elected officials at all levels of government
  - Address-based lookup capability (not limited to lat/long coordinates)
  - Reliable and well-maintained API with good documentation
  - No restrictive daily API limits that would impact scaling

Alternatives considered:
- **Google Civic Information API**: 
  - As of April 2025, the representatives endpoint was discontinued
  - Only provides election information now
- **Plural's Open States API**: 
  - Limited to state-level representatives
  - Restricted by daily API limits
  - Only supports lookup by lat/long coordinates
  - Less comprehensive than Cicero
- **Center for Tech and Civic Life's Governance Project**:
  - Provides only a static CSV file that must be requested via email
  - Lacks real-time updates and API integration
  - Unresponsive to data requests

## Stretch Goals

Future enhancements to consider:

1. **Campaign System**:
   - Re-add campaigns functionality (previously removed for simplification)
   - Allow users to create reusable campaigns with shareable links
   - Track message send counts and representative targets
   - Public campaigns featured on home screen
   - Campaign impact metrics dashboard
   - User voting/rating system for campaigns

2. **Social Media Integration**:
   - Pull tweets from representatives' Twitter/X profiles
   - Show what representatives are tweeting about relevant issues
   - Allow users to engage with representatives' social content
   - Generate shareable social media posts directed at representatives
   - Create pre-filled X/Twitter, Instagram, or Facebook posts with tags to officials
   - Track social media engagement metrics for campaigns

3. **Enhanced Draft Features**:
   - Accept user feedback on drafts and offer rewrites
   - Allow users to select different tones (formal, assertive, personal)
   - Provide options to customize draft length and complexity
   - Allow users to choose which contact method to use for each representative
   - Implement caching for draft generation to improve performance
   - Add caching for Cicero API calls to reduce API usage and improve load times

4. **Election Year Features**:
   - Identify and contact candidates running for office (not just incumbents)
   - Provide information about candidates' positions on issues
   - Track candidate responses to user emails
   - May use Google Civic API for election candidates information

5. **Issue Research Assistant**:
   - Help users research issues they care about
   - Suggest credible sources and statistics to strengthen arguments
   - Provide context about relevant legislation and policy positions
   - Generate fact-based talking points on demand

6. **Advanced Analytics**:
   - Track email open rates (would require sending through our servers)
   - Aggregate common issues
   - Visualize geographic distribution of concerns