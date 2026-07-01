# MovieRec

A single-user movie and TV show recommendation engine powered by TMDB data. Rate what you've seen with 1–5 stars and get personalized recommendations based on genre, keyword, cast/crew, and era preferences.

Built with [Next.js 16](https://nextjs.org) (App Router), TypeScript, Tailwind CSS v4, [Prisma v7](https://prisma.io) + SQLite, and the [TMDB API](https://developer.themoviedb.org).

## Features

- **Browse** — Discover trending movies and TV shows, filter by genre or search by title
- **Rate** — Star-based rating (1–5) with a swipe-like interface; skip titles you haven't seen
- **Recommendations** — Multi-signal scoring engine (genre 30%, keyword 25%, cast/crew 20%, era 10%) produces match scores for every title
- **Taste Profile** — Visual breakdown of your preferences: top genres, keywords, favorite directors and actors, decade distribution, and rating history
- **Revolving Spotlight** — Home page auto-rotates through your top recommendations with per-signal breakdowns
- **Skip Tracking** — "Haven't Seen" permanently removes a title from future queues without affecting your profile

## Getting Started

### Prerequisites

- Node.js 22+
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Add your TMDB_API_KEY to .env

# Create and seed the database (fetches ~1000 movies + ~1000 TV shows from TMDB)
npm run seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed database from TMDB (rate-limited to 48 req/s) |
| `npm run lint` | Run ESLint |

## Deployment

Can be deployed to Vercel with zero configuration. Set `TMDB_API_KEY` as an environment variable. No external database needed — SQLite is stored in `prisma/dev.db`.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── movies/         Movie/TV data (TMDB + DB)
│   │   ├── ratings/        CRUD for star ratings
│   │   ├── recommendations/ Multi-signal scoring engine
│   │   ├── profile/        Taste profile aggregation
│   │   └── skip/           Track "Haven't Seen" titles
│   ├── movies/[id]/        Movie/TV detail page
│   ├── recommendations/    Recommendation pages (movies + TV)
│   ├── swipe/              Star-based rating flow
│   └── taste/              Taste profile visualization
├── components/             Reusable UI components
├── engine/
│   ├── profile.ts          Build user profile from ratings
│   ├── scorer.ts           Multi-signal scoring algorithm
│   ├── features.ts         Feature extraction & similarity
│   └── types.ts            Type definitions
└── lib/
    ├── prisma.ts           Prisma client (better-sqlite3 adapter)
    ├── tmdb.ts             TMDB API wrapper
    └── seed.ts             Database seeder
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Prisma v7 + SQLite (better-sqlite3)
- **UI**: Tailwind CSS v4, framer-motion, lucide-react
- **Data**: TMDB API (movies + TV, 48 req/s rate-limited fetching)
- **Font**: Geist (Vercel)
