"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  id: number;
  title: string;
  posterUrl: string | null;
  year: number;
  matchScore?: number;
  className?: string;
}

export function MovieCard({ id, title, posterUrl: poster, year, matchScore, className }: MovieCardProps) {
  return (
    <Link
      href={`/movies/${id}`}
      className={cn("group relative block aspect-[2/3] overflow-hidden rounded-lg bg-surface border border-border hover:border-accent/50 transition-all duration-200", className)}
    >
      {poster ? (
        <img
          src={poster}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted text-sm p-2 text-center">
          {title}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <p className="text-xs font-medium truncate leading-tight">{title}</p>
        <p className="text-[10px] text-muted">{year}</p>
      </div>
      {matchScore !== undefined && (
        <div
          className={cn(
            "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
            matchScore >= 85 ? "bg-emerald text-black" : matchScore >= 70 ? "bg-amber text-black" : "bg-surface/90 text-muted"
          )}
        >
          {matchScore}%
        </div>
      )}
    </Link>
  );
}
