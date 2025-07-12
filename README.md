# Outrage - Contact Your Representatives

[![GitHub Stars](https://img.shields.io/github/stars/mitchellgordon95/Outrage?style=social)](https://github.com/mitchellgordon95/Outrage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Outrage is a web application that empowers citizens to quickly and effectively contact their elected representatives about issues they care about. With AI-powered draft generation, comprehensive representative lookup, and a Chrome extension for auto-filling contact forms, Outrage makes civic engagement accessible to everyone.

## 🚀 Features

### Core Functionality
- **📍 Address-based Representative Lookup**: Find all your representatives (federal, state, and local) with a single address search
- **🤖 AI-Powered Draft Generation**: Create personalized, persuasive emails using Anthropic's Claude
- **📧 Multi-Representative Contact**: Send emails to multiple representatives simultaneously
- **🔗 Shareable Campaigns**: Create and share campaigns to mobilize others around issues

### Advanced Features
- **🎥 YouTube Integration**: Automatically extracts political demands from YouTube videos via cron jobs
- **🔧 Chrome Extension**: Auto-fills government contact forms on .gov websites
- **📊 Campaign Analytics**: Track how many messages have been sent for each campaign
- **💾 Session Persistence**: Save and resume drafts across sessions
- **🎯 Smart Representative Selection**: AI suggests which representatives to contact based on your issues

## 📸 Screenshots

<details>
<summary>Click to view application flow</summary>

1. **Address Input** - Google Maps autocomplete for easy address entry
2. **Demands Selection** - Browse pre-populated demands or enter custom ones
3. **Representative Selection** - View and select from all your representatives
4. **Personal Info** - Add optional details to strengthen your message
5. **Draft Preview** - Review and edit AI-generated drafts before sending
</details>

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL (Vercel Postgres/Neon)
- **AI/ML**: Anthropic Claude API, Apify (YouTube transcripts)
- **External APIs**: Google Maps, Cicero (representatives data)
- **Infrastructure**: Vercel (hosting), GitHub Actions (CI/CD)

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL database (local or cloud)
- API keys (see Environment Variables section)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mitchellgordon95/Outrage.git
   cd Outrage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your API keys and configuration (see below)

4. **Set up the database**
   ```bash
   # Run the SQL scripts to create tables
   psql -d your_database -f campaigns_schema.sql
   psql -d your_database -f youtube_demands_schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the application

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=your_postgresql_connection_string
POSTGRES_URL=your_postgresql_connection_string

# Google APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Cicero API (Representative Data)
CICERO_API_KEY=your_cicero_api_key

# AI/ML
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
APIFY_TOKEN=your_apify_token

# Chrome Extension
NEXT_PUBLIC_CHROME_EXTENSION_ID=your_extension_id

# YouTube Integration
YOUTUBE_CHANNEL_LIST=channel1,channel2,channel3

# Cron Jobs
CRON_SECRET=your_cron_secret

# Optional: Analytics
# Add Vercel Analytics or other tracking services
```

## 📦 Chrome Extension

The Chrome extension enables auto-filling of government contact forms.

### Installation

1. Navigate to `chrome-extension/` directory
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `chrome-extension` folder

### Development

See [chrome-extension/README.md](chrome-extension/README.md) for detailed development instructions.

## 🗄️ Database Schema

The application uses PostgreSQL with two main tables:

- **campaigns**: Stores campaign information and tracking data
- **youtube_demands**: Stores extracted demands from YouTube videos

See `campaigns_schema.sql` and `youtube_demands_schema.sql` for complete schemas.

## 🔄 Cron Jobs

### YouTube Demands Processing
- **Endpoint**: `/api/cron/youtube-demands`
- **Frequency**: Daily
- **Function**: Fetches videos from configured YouTube channels and extracts political demands

Configure in `vercel.json` or your hosting platform's cron configuration.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application is built with Next.js and can be deployed to any platform that supports Node.js applications. Ensure you:
- Set up PostgreSQL database
- Configure environment variables
- Set up cron jobs for YouTube processing

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📝 API Documentation

### Public Endpoints

- `GET /api/demands/categories` - Fetch categorized demands including YouTube sources
- `GET /api/campaigns` - List popular campaigns

### Protected Endpoints

- `POST /api/lookup-representatives` - Find representatives by address
- `POST /api/generate-representative-draft` - Generate AI draft
- `POST /api/campaigns/create` - Create new campaign
- `POST /api/campaigns/[id]/increment` - Track message sent

See individual route files for detailed request/response schemas.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use TypeScript for type safety
- Write tests for new features
- Ensure `npm run lint` passes

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cicero API](https://www.cicerodata.com/) for comprehensive representative data
- [Anthropic](https://www.anthropic.com/) for Claude AI
- [Apify](https://apify.com/) for YouTube transcript extraction
- All contributors and users making civic engagement easier

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mitchellgordon95/Outrage/issues)
- **Email**: contact@outrage.gg
- **Discussions**: [GitHub Discussions](https://github.com/mitchellgordon95/Outrage/discussions)

---

Built with ❤️ to make democracy more accessible