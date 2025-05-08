# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Outrage" is a website that lets users quickly send emails to their elected representatives in the US about issues they care about. The application follows this flow:

1. **Address Input**: First page contains an address box with Google Maps autocomplete
2. **Issue Details**: Second page asks for:
   - A list of "facts" (one-liners about issues the user cares about)
   - Optional personal information (name, voting history, etc.)
   - Shows all local elected officials (city representatives, congress representatives, and the president)
     - Officials are lazy-loaded with a progress bar while user completes other information
     - All officials are checked by default, but can be unchecked by the user
3. **Draft Generation**: AI-powered letter drafting using LiteLLM (customizable model)
   - Draft button generates email subject and content based on user's facts
   - Draft appears at the bottom of the page
4. **Email Sending**: "Send Emails" button opens mailto: tabs populated with the drafts
5. **Campaign Creation**: Redirects to a "Make a Campaign" screen that:
   - Converts facts into a re-usable campaign with a shareable link
   - Tracks how many drafts have been created and which representatives they're being sent to

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

### Key Components

1. **Frontend**:
   - Address input with Google Maps integration
   - Form for collecting facts and personal information
   - Representative display and selection
   - Draft display and email sending functionality
   - Campaign creation and sharing

2. **Backend Services**:
   - Representative lookup based on address (see details below)
   - AI draft generation using LiteLLM
   - Campaign tracking and management

3. **External Integrations**:
   - Google Maps API for address autocomplete
   - LiteLLM for AI model flexibility
   - Email client integration via mailto: links

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

1. **Public Campaigns**:
   - Campaigns can be made public and featured on the home screen
   - Public dashboard showing campaign impact metrics
   - User voting/rating system for campaigns

2. **Social Media Integration**:
   - Pull tweets from representatives' Twitter/X profiles
   - Show what representatives are tweeting about relevant issues
   - Allow users to engage with representatives' social content
   - Generate shareable social media posts directed at representatives
   - Create pre-filled X/Twitter, Instagram, or Facebook posts with tags to officials
   - Track social media engagement metrics for campaigns

3. **Election Year Features**:
   - Identify and contact candidates running for office (not just incumbents)
   - Provide information about candidates' positions on issues
   - Track candidate responses to user emails
   - May use Google Civic API for election candidates information

4. **Advanced Analytics**:
   - Track email open rates (would require sending through our servers)
   - Aggregate common issues across campaigns
   - Visualize geographic distribution of concerns

5. **Enhanced Draft Features**:
   - Accept user feedback on drafts and offer rewrites
   - Allow users to select different tones (formal, assertive, personal)
   - Provide options to customize draft length and complexity
   - Allow users to choose which contact method to use for each representative
   - Implement caching for draft generation to improve performance
   - Add caching for Cicero API calls to reduce API usage and improve load times

6. **Fact Research Assistant**:
   - Help users research issues they care about
   - Suggest credible sources and statistics to strengthen arguments
   - Provide context about relevant legislation and policy positions
   - Generate fact-based talking points on demand