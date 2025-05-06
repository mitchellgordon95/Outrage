# Outrage

Outrage is a web application that lets users quickly send emails to their elected representatives in the US about issues they care about.

## Features

- Address input with Google Maps autocomplete
- Lookup of all elected representatives (federal, state, and local)
- Creation of customized email messages based on user input
- Email sending via mailto: links
- Creation of shareable campaigns

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Google Maps API key with Places API enabled
- Google Civic Information API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/outrage.git
cd outrage
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy the `.env.example` file to a new file named `.env.local`:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file and add your API keys:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY=your_google_civic_api_key
```

### Development

To start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable UI components
- `/src/services` - API service functions
- `/public` - Static assets

## Features in Detail

### Address Input

The first page contains an address input box with Google Maps autocomplete integration, making it easy for users to enter their full address accurately.

### Issue Details

The second page allows users to:

- Enter a list of "facts" (one-liners about issues they care about)
- Provide optional personal information (name, voting history)
- View all their local elected officials (lazy-loaded while they complete other information)
- Select which representatives to contact (all are selected by default)

### Draft Generation

Email drafts are generated using AI, powered by the Anthropic API with Claude 3.5 Sonnet as the default model. The draft is personalized based on the user's facts and personal information, creating persuasive and respectful emails to representatives. The model can be easily changed through environment variables.

### Email Sending

The "Send Emails" button opens mailto: links populated with the generated drafts, one for each selected representative.

### Campaign Creation

After sending emails, users can create a campaign with a shareable link, allowing others to join and send similar messages to their own representatives.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.