"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";

interface SwipeCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  year: number;
  genres: { id: number; name: string }[];
  onSwipe: (id: number, liked: boolean) => void;
}

export function SwipeCard({ id, title, posterPath, year, genres, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 120) onSwipe(id, true);
    else if (info.offset.x < -120) onSwipe(id, false);
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface border border-border">
        {posterPath ? (
          <img src={posterPath} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted p-4 text-center">{title}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted">{year}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {genres.slice(0, 4).map((g) => (
              <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted">
                {g.name}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          className="absolute top-8 right-8"
          style={{ opacity: likeOpacity }}
        >
          <div className="px-4 py-2 rounded-lg border-2 border-emerald text-emerald font-bold text-lg rotate-12 bg-black/40 backdrop-blur-sm">
            LIKE
          </div>
        </motion.div>

        <motion.div
          className="absolute top-8 left-8"
          style={{ opacity: nopeOpacity }}
        >
          <div className="px-4 py-2 rounded-lg border-2 border-accent text-accent font-bold text-lg -rotate-12 bg-black/40 backdrop-blur-sm">
            NOPE
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
