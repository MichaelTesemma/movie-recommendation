"use client";

import { useEffect, useState } from "react";
import { MovieCard } from "@/components/MovieCard";
import { Sparkles, RefreshCw } from "lucide-react";

interface RecData {
  profile: { totalRatings: number; topGenres: number[] };
  recommendations: {
    movieId: number;
    title: string;
    posterUrl: string | null;
    year: number;
    genres: { id: number; name: string }[];
    matchScore: number;
  }[];
}

const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV",
  53: "Thriller", 10752: "War", 37: "Western",
};

export function RecommendationsList({ type }: { type: "movie" | "tv" }) {
  const [data, setData] = useState<RecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecs = async (shuffle = false) => {
    try {
      const res = await fetch(`/api/recommendations?n=50&type=${type}${shuffle ? "&shuffle=1" : ""}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRecs(); }, [type]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecs(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  const recs = data?.recommendations ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold">{type === "movie" ? "Movie Recommendations" : "TV Show Recommendations"}</h1>
          {profile && (
            <p className="text-sm text-muted mt-1">
              Based on your {profile.totalRatings} ratings
              {profile.topGenres.length > 0 && (
                <> — you like <span className="text-foreground font-medium">
                  {profile.topGenres.map((g) => GENRE_NAMES[g]).filter(Boolean).join(", ")}
                </span></>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="text-muted mb-3" size={32} />
          <p className="text-muted mb-2">No recommendations yet.</p>
          <p className="text-sm text-muted">Rate some {type === "movie" ? "movies" : "TV shows"} on the Rate page first.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recs.map((r) => (
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
      )}
    </div>
  );
}
