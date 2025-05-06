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

For finding elected representatives based on user address, the **Google Civic Information API** is the recommended solution:

- **Endpoint**: Representatives lookup by address
- **Features**:
  - Free service (up to 25,000 queries per day)
  - Returns representatives at all levels (local, state, federal)
  - Provides name, office, contact information (including email)
  - Returns representative data organized by political geography
- **Implementation**: Requires Google API key with the Civic Information API enabled
- **Documentation**: [Google Civic Information API](https://developers.google.com/civic-information)

Alternative/backup approaches:
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

4. **Advanced Analytics**:
   - Track email open rates (would require sending through our servers)
   - Aggregate common issues across campaigns
   - Visualize geographic distribution of concerns