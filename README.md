# GGBench

A platform for comparing AI-generated graphics through community voting and ELO-based rankings.

## Features

- **Community Voting**: Compare AI-generated graphics side by side and vote for your favorite
- **ELO Rankings**: See how different AI models perform with our ELO-based ranking system
- **Performance Analytics**: Get detailed insights into model performance with comprehensive analytics
- **Category Filtering**: Filter results by animation type to see model performance in specific categories

## Pages

- **Home**: Landing page with platform overview and call-to-action
- **Voting**: Side-by-side comparison interface for voting on AI-generated graphics
- **Leaderboard**: ELO-based rankings with filtering by animation type
- **About**: Information about the platform, mission, and technology

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript
- **Deployment**: Vercel-ready

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   ```bash
   cp env.example .env.local
   ```
   Then edit `.env.local` with your `DATABASE_URL`. For local development, you can use:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/ggbench
   ```

3. Set up the database:
   ```bash
   npm run setup-db
   ```
   This will create the database tables and an admin user (admin/admin123).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Admin Access

After running the setup script, you can log in as an admin:
- Username: `admin`
- Password: `admin123`

The admin panel will be available at `/admin` where you can:
- Add new LLM models with their API configurations and endpoints
- Add new prompts for animation generation
- Generate animations using the selected model and prompt
- View current models and their ELO rankings

## Database Migrations

If you're updating an existing database, run the migration to add the new `api_endpoint` field:

```bash
npm run migrate-api-endpoint
```

This will add the `api_endpoint` column to the models table for storing API endpoint URLs.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

This project is configured for deployment on Vercel. Simply connect your repository to Vercel and it will automatically deploy.

## Project Structure

```
ggbench/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── voting/            # Voting page
│   ├── leaderboard/       # Leaderboard page
│   └── about/             # About page
├── components/            # Reusable components
│   └── Navigation.tsx     # Navigation component
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

# TODO
dont show blank animations
threejs



# contacts
claude jack
simonwillson
p5js peeps
quinton
