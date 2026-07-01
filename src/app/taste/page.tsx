"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Star, Film, User, Hash, Calendar, TrendingUp, List, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenreStat {
  id: number;
  name: string;
  weight: number;
}

interface KeywordStat {
  id: number;
  name: string;
  weight: number;
}

interface CastStat {
  tmdbId: number;
  name: string;
  role: string;
  weight: number;
}

interface DecadeStat {
  decade: number;
  count: number;
}

interface RatedMovie {
  id: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  mediaType: string;
  value: number;
  genres: { id: number; name: string }[];
}

interface ProfileData {
  totalRatings: number;
  genres: GenreStat[];
  keywords: KeywordStat[];
  directors: CastStat[];
  actors: CastStat[];
  decades: DecadeStat[];
  distribution: number[];
  ratings: RatedMovie[];
}

export default function TastePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKw, setSelectedKw] = useState<KeywordStat | null>(null);
  const [kwMovies, setKwMovies] = useState<RatedMovie[]>([]);
  const [kwLoading, setKwLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalRatings === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <BarChart3 className="text-muted mb-3" size={32} />
        <p className="text-muted mb-2">No ratings yet.</p>
        <p className="text-sm text-muted">Rate some movies to build your taste profile.</p>
      </div>
    );
  }

  const maxGenreWeight = Math.max(...data.genres.map((g) => g.weight), 1);
  const maxKeywordWeight = Math.max(...data.keywords.map((k) => k.weight), 1);
  const maxDirectorWeight = Math.max(...data.directors.map((d) => d.weight), 1);
  const maxActorWeight = Math.max(...data.actors.map((a) => a.weight), 1);
  const maxDecadeCount = Math.max(...data.decades.map((d) => d.count), 1);

  const topGenre = data.genres[0]?.name ?? "";
  const topDecade = [...data.decades].sort((a, b) => b.count - a.count)[0]?.decade ?? 0;
  const avgRating = data.distribution.reduce((sum, c, i) => sum + c * (i + 1), 0) / data.totalRatings;
  const likesDistribution = data.distribution.slice(3).reduce((a, b) => a + b, 0);
  const likesPct = Math.round((likesDistribution / data.totalRatings) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Your Taste Profile</h1>
        <p className="text-sm text-muted mt-1">Based on {data.totalRatings} rating{data.totalRatings !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <Star size={16} className="text-amber mb-2" />
          <p className="text-xs text-muted">Avg Rating</p>
          <p className="text-xl font-bold">{avgRating.toFixed(1)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <TrendingUp size={16} className="text-green-400 mb-2" />
          <p className="text-xs text-muted">Like Rate</p>
          <p className="text-xl font-bold">{likesPct}%</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <Film size={16} className="text-accent mb-2" />
          <p className="text-xs text-muted">Top Genre</p>
          <p className="text-lg font-bold truncate">{topGenre || "—"}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <Calendar size={16} className="text-blue-400 mb-2" />
          <p className="text-xs text-muted">Favorite Era</p>
          <p className="text-lg font-bold">{topDecade}s</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Hash size={14} className="text-accent" /> Genre Preferences
        </h2>
        <div className="space-y-2">
          {data.genres.slice(0, 8).map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="text-xs text-muted w-20 shrink-0 text-right">{g.name}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/60 transition-all duration-500"
                  style={{ width: `${(g.weight / maxGenreWeight) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-muted w-8">{g.weight.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </section>

      {data.keywords.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Hash size={14} className="text-accent" /> Favorite Keywords
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.keywords.slice(0, 15).map((kw) => (
              <button
                key={kw.id}
                onClick={async () => {
                  setSelectedKw(selectedKw?.id === kw.id ? null : kw);
                  setKwLoading(true);
                  try {
                    const res = await fetch(`/api/movies?keyword=${kw.id}`);
                    setKwMovies(await res.json());
                  } catch {}
                  setKwLoading(false);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                  selectedKw?.id === kw.id
                    ? "bg-accent text-white border-accent"
                    : "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                )}
              >
                {kw.name}
              </button>
            ))}
          </div>
          {selectedKw && (
            <div className="rounded-xl bg-surface border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium">Movies with &ldquo;{selectedKw.name}&rdquo;</p>
                <button onClick={() => setSelectedKw(null)} className="text-muted hover:text-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
              {kwLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : kwMovies.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">No movies found for this keyword.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {kwMovies.slice(0, 12).map((m) => (
                    <Link key={m.id} href={`/movies/${m.id}`} className="group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-background mb-1.5">
                        {m.posterUrl ? (
                          <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted p-1 text-center">{m.title}</div>
                        )}
                      </div>
                      <p className="text-[11px] font-medium truncate">{m.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {data.directors.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <User size={14} className="text-accent" /> Favorite Directors
          </h2>
          <div className="space-y-2">
            {data.directors.map((p) => (
              <div key={p.tmdbId} className="flex items-center gap-3">
                <span className="text-xs text-muted w-24 shrink-0 truncate text-right">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-400/60 transition-all duration-500"
                    style={{ width: `${(p.weight / maxDirectorWeight) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted w-8">{p.weight.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.actors.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <User size={14} className="text-accent" /> Favorite Actors
          </h2>
          <div className="space-y-2">
            {data.actors.map((p) => (
              <div key={p.tmdbId} className="flex items-center gap-3">
                <span className="text-xs text-muted w-24 shrink-0 truncate text-right">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-400/60 transition-all duration-500"
                    style={{ width: `${(p.weight / maxActorWeight) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted w-8">{p.weight.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-accent" /> Decade Distribution
        </h2>
        <div className="flex items-end gap-2 h-28">
          {data.decades.map((d) => (
            <div key={d.decade} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-accent/60 transition-all duration-500"
                style={{ height: `${(d.count / maxDecadeCount) * 100}%`, minHeight: 4 }}
              />
              <span className="text-[10px] text-muted">{d.decade}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Star size={14} className="text-amber" /> Rating Distribution
        </h2>
        <div className="flex items-end gap-2 h-28">
          {data.distribution.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn("w-full rounded-t-md transition-all duration-500", i >= 3 ? "bg-accent/60" : "bg-white/10")}
                style={{ height: `${(count / Math.max(...data.distribution, 1)) * 100}%`, minHeight: 4 }}
              />
              <span className="text-[10px] text-muted">{i + 1}★</span>
              <span className="text-[10px] text-muted">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <List size={14} className="text-accent" /> Your Ratings
        </h2>
        <div className="space-y-2">
          {data.ratings.map((r) => (
            <Link
              key={r.id}
              href={`/movies/${r.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-colors"
            >
              <div className="w-10 h-14 rounded-md overflow-hidden shrink-0 bg-background">
                {r.posterUrl ? (
                  <img src={r.posterUrl} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-muted">—</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-[11px] text-muted">
                  {r.year}{r.mediaType === "tv" ? " · TV" : ""}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={s <= r.value ? "text-amber fill-amber" : "text-white/10"}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
