# MovieRec

A single-user movie and TV show recommendation engine powered by TMDB data. Rate what you've seen with 1–5 stars and get personalized recommendations based on genre, keyword, cast/crew, and era preferences.

Built with [Next.js 16](https://nextjs.org) (App Router), TypeScript, Tailwind CSS v4, [Firebase Firestore](https://firebase.google.com/docs/firestore), and the [TMDB API](https://developer.themoviedb.org).

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
- A [Firebase project](https://console.firebase.google.com) with Firestore enabled

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Add your TMDB_API_KEY and Firebase service account key to .env

# Seed the database (fetches ~8000+ movies + ~8000+ TV shows from TMDB via discover endpoint)
npm run seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Firestore** (native mode)
3. Go to **Project Settings → Service accounts** → **Generate new private key**
4. Save the downloaded JSON as `firebase-key.json` in the project root (already gitignored)
5. Set the JSON content as the `FIREBASE_PRIVATE_KEY` environment variable on Vercel

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed database from TMDB (discover endpoint, rate-limited to 48 req/s) |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |

## Deployment

```bash
vercel deploy --prod
```

Set `TMDB_API_KEY` and `FIREBASE_PRIVATE_KEY` as Vercel environment variables. The Firebase service account JSON should be set as the value of `FIREBASE_PRIVATE_KEY`.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── movies/         Movie/TV data (TMDB + Firestore)
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
    ├── firebase.ts         Firebase Admin SDK client
    ├── db.ts               Firestore database abstraction
    ├── tmdb.ts             TMDB API wrapper
    ├── types.ts            Document type definitions
    └── seed.ts             Database seeder
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Firebase Firestore (via Admin SDK)
- **UI**: Tailwind CSS v4, framer-motion, lucide-react
- **Data**: TMDB API (movies + TV, discover endpoint, 48 req/s rate-limited)
- **Font**: Geist (Vercel)
- **Testing**: Vitest

## Testing

```bash
npm test        # Run tests once
npm run test:watch  # Watch mode
```

Tests cover the recommendation engine (feature extraction, profile building, scoring), TMDB utility functions, and UI utilities.
