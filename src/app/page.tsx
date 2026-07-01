"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MovieCard } from "@/components/MovieCard";
import { Search, TrendingUp, Star, Film, Tv, ChevronLeft, ChevronRight, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Movie {
  id: number;
  title: string;
  year?: number;
  releaseDate?: string;
  posterUrl: string | null;
  genres: { id: number; name: string }[];
  ratings: { value: number }[];
}

interface RecItem {
  movieId: number;
  title: string;
  posterUrl: string | null;
  year: number;
  genres: { id: number; name: string }[];
  matchScore: number;
  signals: { genre: number; keyword: number; crew: number; tmdb: number; era: number };
}

const GENRES = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 878, name: "Sci-Fi" },
  { id: 27, name: "Horror" },
  { id: 53, name: "Thriller" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 99, name: "Documentary" },
  { id: 10749, name: "Romance" },
  { id: 9648, name: "Mystery" },
  { id: 80, name: "Crime" },
];

const SIGNAL_LABELS: Record<string, string> = {
  genre: "Genre match",
  keyword: "Similar keywords",
  crew: "Same cast/crew",
  era: "Favorite era",
};

const SIGNAL_PCT = { genre: 30, keyword: 25, crew: 20, tmdb: 15, era: 10 };

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [mode, setMode] = useState<"recs" | "browse">("recs");
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState<RecItem | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/ratings`).then((r) => r.json()).then((data) => {
      setRatingsCount(data.length);
    });
  }, []);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/movies?popular=1&type=${type}`;
      if (selectedGenre) url = `/api/movies?genre=${selectedGenre}&type=${type}`;
      if (searchQuery) url = `/api/movies?search=${encodeURIComponent(searchQuery)}&type=${type}`;
      const res = await fetch(url);
      setMovies(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, searchQuery, type]);

  const fetchRecs = useCallback(async () => {
    try {
      const res = await fetch(`/api/recommendations?n=30&type=${type}`);
      const data = await res.json();
      setRecs(data.recommendations ?? []);
    } catch (e) {
      console.error(e);
    }
  }, [type]);

  useEffect(() => {
    if (ratingsCount >= 3 && mode === "recs") {
      fetchRecs();
    }
  }, [ratingsCount, mode, fetchRecs]);

  useEffect(() => {
    if (mode === "browse" || searchQuery || selectedGenre) {
      fetchMovies();
    }
  }, [mode, searchQuery, selectedGenre, type, fetchMovies]);

  const startAutoRotate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSpotlightIdx((prev) => {
        if (recs.length <= 1) return prev;
        return recs.length > 0 ? (prev + 1) % Math.min(recs.length, 10) : prev;
      });
    }, 5000);
  }, [recs.length]);

  useEffect(() => {
    if (recs.length > 1) {
      startAutoRotate();
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [recs.length, startAutoRotate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMode("browse");
    fetchMovies();
  };

  const activeRecs = recs.slice(0, 10);
  const spotlight = activeRecs[spotlightIdx];

  const showRecs = ratingsCount >= 3 && mode === "recs" && recs.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-surface rounded-lg p-1 border border-border">
          <button
            onClick={() => setType("movie")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", type === "movie" ? "bg-accent text-white" : "text-muted hover:text-foreground")}
          >
            <Film size={13} /> Movies
          </button>
          <button
            onClick={() => setType("tv")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", type === "tv" ? "bg-accent text-white" : "text-muted hover:text-foreground")}
          >
            <Tv size={13} /> TV Shows
          </button>
        </div>
        <div className="flex items-center gap-2">
          {ratingsCount >= 3 && (
            <button
              onClick={() => { setMode(mode === "recs" ? "browse" : "recs"); setSpotlightIdx(0); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border", mode === "recs" ? "bg-accent/10 text-accent border-accent/20" : "bg-surface text-muted border-border hover:text-foreground")}
            >
              {mode === "recs" ? "Browse All" : "Recommendations"}
            </button>
          )}
          {ratingsCount > 0 && (
            <Link
              href="/taste"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-muted border border-border hover:text-foreground transition-colors"
            >
              <BarChart3 size={13} /> My Taste
            </Link>
          )}
        </div>
      </div>

      {showRecs ? (
        <>
          <div className="relative mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted">Recommended for you</h2>
              <span className="text-xs text-muted">{spotlightIdx + 1} of {activeRecs.length}</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-surface border border-border">
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-1/3 aspect-[2/3] sm:aspect-auto bg-background">
                  {spotlight.posterUrl ? (
                    <img src={spotlight.posterUrl} alt={spotlight.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted p-4 text-center text-sm">{spotlight.title}</div>
                  )}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-accent text-white text-xs font-bold">
                    {spotlight.matchScore}% match
                  </div>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{spotlight.title}</h2>
                    <p className="text-sm text-muted mb-3">{spotlight.year}</p>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {spotlight.genres.map((g) => (
                        <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted">
                          {g.name}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowBreakdown(showBreakdown?.movieId === spotlight.movieId ? null : spotlight)}
                      className="text-xs text-accent hover:underline"
                    >
                      {showBreakdown?.movieId === spotlight.movieId ? "Hide why" : "Why this was recommended →"}
                    </button>
                    {showBreakdown?.movieId === spotlight.movieId && (
                      <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {Object.entries(SIGNAL_LABELS).map(([key, label]) => {
                          const score = spotlight.signals[key as keyof typeof spotlight.signals] ?? 0;
                          const contribution = Math.round(score * (SIGNAL_PCT[key as keyof typeof SIGNAL_PCT] ?? 0));
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-muted w-28 shrink-0">{label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full bg-accent/60" style={{ width: `${Math.min(score * 100, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted w-12 text-right">{contribution}%</span>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-muted mt-1">Each signal contributes a weighted percentage to the total {spotlight.matchScore}% match score.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => window.location.href = `/movies/${spotlight.movieId}`}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => window.location.href = `/swipe?type=${type}`}
                      className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                      Rate More
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSpotlightIdx((prev) => (prev - 1 + activeRecs.length) % activeRecs.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setSpotlightIdx((prev) => (prev + 1) % activeRecs.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex justify-center gap-1.5 mt-3">
              {activeRecs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSpotlightIdx(i)}
                  className={cn("w-1.5 h-1.5 rounded-full transition-all", i === spotlightIdx ? "bg-accent w-3" : "bg-white/20 hover:bg-white/40")}
                />
              ))}
            </div>
          </div>

          {recs.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-muted mb-4">More recommendations</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recs.slice(1, 16).map((r) => (
                  <div key={r.movieId} className="relative">
                    <MovieCard
                      id={r.movieId}
                      title={r.title}
                      posterUrl={r.posterUrl}
                      year={r.year}
                      matchScore={r.matchScore}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <form onSubmit={handleSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder={`Search ${type === "movie" ? "movies" : "TV shows"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </form>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => { setSelectedGenre(null); setMode("recs"); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!selectedGenre ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"}`}
            >
              <TrendingUp size={14} />
              Trending
            </button>
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelectedGenre(g.id); setMode("browse"); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedGenre === g.id ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-surface animate-pulse" />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-20">
              <Star className="mx-auto text-muted mb-3" size={32} />
              {ratingsCount < 3 ? (
                <div>
                  <p className="text-muted mb-2">Rate at least 3 movies to get recommendations.</p>
                  <a href="/swipe" className="text-accent text-sm hover:underline">Go to Rate page →</a>
                </div>
              ) : (
                <p className="text-muted">No movies found. Try a different search or genre.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((m) => (
                <MovieCard
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  posterUrl={m.posterUrl}
                  year={m.releaseDate ? new Date(m.releaseDate).getFullYear() : m.year ?? 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
