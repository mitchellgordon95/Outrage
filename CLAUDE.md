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
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_CIVIC_API_KEY=your_google_civic_api_key
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

Currently using a CSV file provided by the Governance Project at techandciviclife.org for elected officials data.

- **Implementation**: Data is loaded from a CSV file with representative information
- **Future Consideration**: May use Google Civic Information API as an alternative or enhancement

Alternative/backup approaches:
- **Google Civic Information API**: 
  - Free service (up to 25,000 queries per day)
  - Returns election information and officials at various government levels
  - Provides polling locations, ballot information, and election administration details
  - Organizes information based on political geography of an address
- **OpenStates API**: Provides state-level representatives via the `/people.geo` endpoint
- Custom scraping solution from government websites (more maintenance, less reliable)

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

3. **Election Year Features**:
   - Identify and contact candidates running for office (not just incumbents)
   - Provide information about candidates' positions on issues
   - Track candidate responses to user emails
   - May use Google Civic API for election candidates information

4. **Advanced Analytics**:
   - Track email open rates (would require sending through our servers)
   - Aggregate common issues across campaigns
   - Visualize geographic distribution of concerns