# Implementation Plan: Movie Recommendation Website

**Stack:** Next.js 14 (App Router) + TypeScript + Prisma + SQLite + Tailwind CSS + shadcn/ui  
**Data Source:** TMDB API  
**Recommendation Engine:** In-app content-based scoring (TypeScript)

---

## Progress Summary

| Step | Files | Status |
|------|-------|--------|
| 1: Scaffold + Config | 6 | Pending |
| 2: Database Schema + Prisma | 4 | Pending |
| 3: TMDB API Wrapper + Seed | 3 | Pending |
| 4: Recommendation Engine | 4 | Pending |
| 5: API Routes | 3 | Pending |
| 6: Browse Page | 4 | Pending |
| 7: Swipe Page | 3 | Pending |
| 8: Recommendations Page | 2 | Pending |
| 9: Movie Detail Page | 2 | Pending |
| 10: Polish + Deploy Config | 3 | Pending |

---

## Step 1: Scaffold + Config

**Verify:** `npm run dev` starts the app with no errors, Prisma generates client.

- [ ] **`package.json`** — Next.js 14, prisma, @prisma/client, tailwindcss, class-variance-authority, lucide-react, framer-motion (for swipe animations), zustand (for state). Create via `npx create-next-app@latest`.
- [ ] **`tsconfig.json`** — Path aliases: `@/` → `src/`.
- [ ] **`tailwind.config.ts`** — shadcn-compatible config with animated classes for swipe cards.
- [ ] **`.env`** — `TMDB_API_KEY=`, `DATABASE_URL=file:./dev.db`.
- [ ] **`components.json`** — shadcn/ui configuration.
- [ ] **`src/lib/utils.ts`** — `cn()` utility from shadcn.

## Step 2: Database Schema + Prisma

**Verify:** `npx prisma db push` creates SQLite tables, `npx prisma studio` shows empty tables.

- [ ] **`prisma/schema.prisma`** — All 5 models: Movie, Genre, Keyword, CastMember, Rating. Relations, unique constraints, indexes on `movieId` and `rating` value.
- [ ] **`src/lib/prisma.ts`** — Singleton Prisma client export (prevents hot-reload connection proliferation).
- [ ] **`.gitignore`** — Add `*.db`, `*.db-journal`, `.env`.

## Step 3: TMDB API Wrapper + Seed Script

**Verify:** Calling `fetchMovies()` returns typed TMDB data; seed script populates 100+ movies in DB.

- [ ] **`src/lib/tmdb.ts`** — TMDB API client. Functions: `fetchTrending()`, `fetchPopular()`, `searchMovies(query)`, `fetchMovieDetails(id)`, `fetchGenres()`, `fetchKeywords(id)`, `fetchCredits(id)`. All return typed responses. Include rate-limit handling (40 req/10s).
- [ ] **`src/lib/seed.ts`** — Seed script: fetch trending + popular movies from TMDB, upsert into DB with genres, keywords, cast. Run via `npx tsx src/lib/seed.ts`. Upsert to avoid duplicates on re-run.
- [ ] **`package.json`** — Add `"seed": "npx tsx src/lib/seed.ts"` script.

## Step 4: Recommendation Engine

**Verify:** Engine unit tests pass (or manual test with Node shows ranked recommendations).

- [ ] **`src/engine/types.ts`** — Shared types: `MovieFeatureVector`, `UserProfile`, `ScoredMovie`, `EngineConfig` (signal weights, diversity params).
- [ ] **`src/engine/features.ts`** — Feature extraction: build `MovieFeatureVector` from Movie + Genre + Keyword + CastMember rows. Genre multi-hot encoding, keyword TF-IDF style vector, crew presence vector. Store as JSON string in `Movie.featureVector`.
- [ ] **`src/engine/profile.ts`** — User profile builder. Reads all `Rating` records, computes `genreWeights` (genre ID → net score), `keywordVec`, `crewScores`, `favDecades`. Handles cold start (0-5 ratings → genre-only mode).
- [ ] **`src/engine/scorer.ts`** — Scoring engine. `scoreMovies(userProfile, candidateMovies)` → `ScoredMovie[]`. Cosine similarity for genre/keyword vectors. Crew matching via overlap coefficient. TMDB similar boost. Genre diversity promotion (demote top-heavy genres). Returns top-N with match percentage.

## Step 5: API Routes

**Verify:** `GET /api/movies` returns JSON, `POST /api/ratings` saves a rating, `GET /api/recommendations` returns scored movies.

- [ ] **`src/app/api/movies/route.ts`** — `GET`: query params `?trending`, `?popular`, `?genre=28`, `?search=inception`. Checks local DB first, falls back to TMDB (and caches). Returns movie list with poster URLs.
- [ ] **`src/app/api/ratings/route.ts`** — `POST`: body `{ movieId, value }`. Upsert rating. `GET`: returns all user ratings with movie details.
- [ ] **`src/app/api/recommendations/route.ts`** — `GET`: Fetches all unrated movies from DB, runs engine scorer, returns top-50 with match percentage and movie metadata.

## Step 6: Browse Page

**Verify:** `/` shows trending movies, search works, genre filters work, click navigates to detail.

- [ ] **`src/app/page.tsx`** — Browse/discover page. Hero search bar with autocomplete. Genre chip row (fetched from `/api/movies?genres`). "Trending" and "Popular" sections as scrollable horizontal rows of movie cards. Infinite scroll or "Load More" button.
- [ ] **`src/components/MovieCard.tsx`** — Poster card component: poster image (next/image with TMDB proxy), title overlay on hover. Links to `/movies/[id]`. Shows rating badge if already rated.
- [ ] **`src/components/GenreChip.tsx`** — Genre filter chip: toggleable, changes query param, fetches filtered results from `/api/movies?genre=X`.
- [ ] **`src/components/SearchBar.tsx`** — Debounced search input with dropdown results. Navigates to movie detail on select.

## Step 7: Swipe Page

**Verify:** `/swipe` shows a movie card, swipe right records like, swipe left records skip, auto-advances.

- [ ] **`src/app/swipe/page.tsx`** — Swipe page. Fetches queue of unrated movies from `/api/movies`. Stack of draggable cards using framer-motion `useDragControls`. On swipe: `POST /api/ratings`. After 10+ ratings, shows "Check your recommendations!" CTA.
- [ ] **`src/components/SwipeCard.tsx`** — Single movie card: poster, title, year, genre chips. Drag handles with rotation/scale physics. Overlay icons (X for left, heart for right) that fade in based on drag direction. Bottom action buttons for like/skip/star/detail.
- [ ] **`src/components/EmptyQueue.tsx`** — Empty state when no more unrated movies: prompt to browse or check recommendations.

## Step 8: Recommendations Page

**Verify:** `/recommendations` shows scored movies ranked by match %, updates when new ratings added.

- [ ] **`src/app/recommendations/page.tsx`** — Recommendations page. Fetches from `/api/recommendations`. Shows taste summary header ("Based on your X ratings — you like Sci-Fi, Thriller"). Grid of recommendation cards with match score badges. "Refresh" button re-fetches.
- [ ] **`src/components/RecCard.tsx`** — Recommendation card: poster, title, year, match % badge (color-coded: green >85%, yellow 70-85%, gray <70%). Genre chips. Like/Watched quick-action buttons.

## Step 9: Movie Detail Page

**Verify:** `/movies/123` shows full movie info with rating buttons and similar movies.

- [ ] **`src/app/movies/[id]/page.tsx`** — Movie detail page. Fetches from `/api/movies?id=X` (deep fetch includes cast, keywords). Hero section: poster + metadata (year, runtime, rating, genres). Overview text. Action buttons (Like, Skip, Watched). "Similar Movies" row at bottom using engine's item-to-item scoring.
- [ ] **`src/components/CastList.tsx`** — Cast/director scrollable row with photos and character names.

## Step 10: Polish + Deploy Config

**Verify:** `npm run build` succeeds; app works on Vercel preview deploy.

- [ ] **`next.config.js`** — TMDB image domain allowed (`image.tmdb.org`). Node.js runtime for API routes (needs Prisma). Bundle analyzer optional.
- [ ] **`src/app/layout.tsx`** — Root layout: shared navigation bar (Browse, Swipe, Recommendations links), Tailwind global styles, shadcn theme provider.
- [ ] **`vercel.json`** — Vercel config: install `prisma generate` as build command step, ensure SQLite works with Vercel (use Turso/LibSQL adapter if needed).
