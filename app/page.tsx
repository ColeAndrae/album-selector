"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import type { Album } from "./types";

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round((rating / 5) * 5);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: i <= stars ? "var(--rust)" : "transparent",
              border: "1.5px solid var(--rust)",
            }}
          />
        ))}
      </div>
      <span
        style={{
          color: "var(--muted)",
          fontSize: "0.75rem",
          fontFamily: "DM Mono, monospace",
        }}
      >
        {rating.toFixed(2)} / 5.00
      </span>
    </div>
  );
}

function AlbumCover({ title, artist }: { title: string; artist: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setImgSrc(null);

    const query = encodeURIComponent(`${title} ${artist}`);
    const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          const artwork = data.results[0].artworkUrl100?.replace(
            "100x100",
            "500x500",
          );
          setImgSrc(artwork || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [title, artist]);

  if (loading) {
    return (
      <div
        className="w-full aspect-square flex items-center justify-center"
        style={{ background: "var(--ink)", borderRadius: "2px" }}
      >
        <div
          className="w-8 h-8 border-2 rounded-full"
          style={{
            borderColor: "var(--rust)",
            borderTopColor: "transparent",
            animation: "spinOnce 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!imgSrc) {
    return (
      <div
        className="w-full aspect-square flex flex-col items-center justify-center gap-3 p-6 text-center"
        style={{ background: "var(--ink)", borderRadius: "2px" }}
      >
        <div style={{ fontSize: "2.5rem" }}>♪</div>
        <div
          style={{
            color: "var(--cream)",
            fontSize: "0.7rem",
            fontFamily: "DM Mono, monospace",
            opacity: 0.5,
          }}
        >
          no cover available
        </div>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`${title} cover`}
      className="w-full aspect-square object-cover fade-up"
      style={{ borderRadius: "2px" }}
    />
  );
}

type Mode = "year" | "genre";

export default function Home() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("year");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [current, setCurrent] = useState<Album | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const spinRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/music.csv")
      .then((r) => r.text())
      .then((csv) => {
        const result = Papa.parse<Record<string, string>>(csv, {
          header: true,
          skipEmptyLines: true,
        });
        const parsed: Album[] = result.data.map((row) => ({
          position: parseInt(row.position, 10),
          release_name: row.release_name,
          artist_name: row.artist_name,
          release_date: row.release_date,
          release_type: row.release_type,
          primary_genres: row.primary_genres,
          secondary_genres:
            row.secondary_genres === "NA" ? "" : row.secondary_genres,
          descriptors: row.descriptors,
          avg_rating: parseFloat(row.avg_rating),
          rating_count: parseInt(row.rating_count, 10),
        }));
        setAlbums(parsed);

        const uniqueYears = Array.from(
          new Set(parsed.map((a) => new Date(a.release_date).getFullYear())),
        ).sort((a, b) => a - b);
        setYears(uniqueYears);
        setSelectedYear(uniqueYears[uniqueYears.length - 1]);

        // Build genre list sorted by frequency
        const genreCount: Record<string, number> = {};
        parsed.forEach((a) => {
          const all = [
            ...a.primary_genres.split(",").map((s) => s.trim()),
            ...(a.secondary_genres
              ? a.secondary_genres.split(",").map((s) => s.trim())
              : []),
          ];
          all.forEach((g) => {
            if (g) genreCount[g] = (genreCount[g] || 0) + 1;
          });
        });
        const sortedGenres = Object.entries(genreCount)
          .sort((a, b) => b[1] - a[1])
          .map(([g]) => g);
        setGenres(sortedGenres);
        setSelectedGenre(sortedGenres[0] || null);
      });
  }, []);

  function pickRandom() {
    if (spinning) return;
    let pool: Album[] = [];
    if (mode === "year" && selectedYear) {
      pool = albums.filter(
        (a) => new Date(a.release_date).getFullYear() === selectedYear,
      );
    } else if (mode === "genre" && selectedGenre) {
      pool = albums.filter((a) => {
        const all = [
          ...a.primary_genres.split(",").map((s) => s.trim()),
          ...(a.secondary_genres
            ? a.secondary_genres.split(",").map((s) => s.trim())
            : []),
        ];
        return all.includes(selectedGenre);
      });
    }
    if (pool.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCurrent(pick);
      setCardKey((k) => k + 1);
      setSpinning(false);
    }, 300);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setCurrent(null);
  }

  const releaseYear = current
    ? new Date(current.release_date).getFullYear()
    : null;
  const releaseFormatted = current
    ? new Date(current.release_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const tags = current
    ? [
        ...current.primary_genres.split(",").map((s) => s.trim()),
        ...(current.secondary_genres
          ? current.secondary_genres.split(",").map((s) => s.trim())
          : []),
      ].slice(0, 6)
    : [];

  const vibes = current
    ? current.descriptors
        .split(",")
        .map((s) => s.trim())
        .slice(0, 8)
    : [];

  const rollLabel = spinning
    ? "ROLLING..."
    : mode === "year"
      ? `ROLL ${selectedYear ?? ""}`
      : `ROLL`;

  const emptyLabel = mode === "year" ? selectedYear : selectedGenre;

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--cream)", fontFamily: "DM Mono, monospace" }}
    >
      {/* Header */}
      <header
        className="border-b"
        style={{ borderColor: "var(--ink)", paddingBottom: "0" }}
      >
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-end justify-between">
          <div>
            <h1
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "clamp(2.5rem, 6vw, 4rem)",
                color: "var(--ink)",
                letterSpacing: "0.05em",
                lineHeight: 1,
              }}
            >
              Album Roulette
            </h1>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.7rem",
                marginTop: "4px",
                letterSpacing: "0.1em",
              }}
            >
              {albums.length > 0
                ? `${albums.length.toLocaleString()} ALBUMS · `
                : ""}
              {years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : ""}
            </p>
          </div>
          <div
            style={{
              fontFamily: "DM Serif Display, serif",
              fontStyle: "italic",
              color: "var(--rust)",
              fontSize: "0.9rem",
            }}
          >
            spin the wheel
          </div>
        </div>

        {/* Mode toggle */}
        <div
          className="border-t"
          style={{ borderColor: "rgba(26,20,16,0.15)" }}
        >
          <div className="max-w-5xl mx-auto px-6 flex gap-0">
            {(["year", "genre"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  padding: "10px 20px",
                  textTransform: "uppercase",
                  color: mode === m ? "var(--cream)" : "var(--muted)",
                  background: mode === m ? "var(--ink)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                By {m}
              </button>
            ))}
          </div>
        </div>

        {/* Selector strip */}
        <div
          className="border-t overflow-x-auto"
          style={{ borderColor: "rgba(26,20,16,0.08)" }}
        >
          <div className="max-w-5xl mx-auto px-6 py-0 flex gap-0">
            {mode === "year"
              ? years.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setCurrent(null);
                    }}
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: "0.7rem",
                      letterSpacing: "0.08em",
                      padding: "10px 14px",
                      color:
                        selectedYear === year ? "var(--cream)" : "var(--muted)",
                      background:
                        selectedYear === year ? "var(--ink)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {year}
                  </button>
                ))
              : genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenre(genre);
                      setCurrent(null);
                    }}
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: "0.7rem",
                      letterSpacing: "0.08em",
                      padding: "10px 14px",
                      color:
                        selectedGenre === genre
                          ? "var(--cream)"
                          : "var(--muted)",
                      background:
                        selectedGenre === genre ? "var(--ink)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {genre}
                  </button>
                ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Spin button */}
        <div className="flex items-center gap-6 mb-12">
          <button
            ref={spinRef}
            onClick={pickRandom}
            disabled={
              spinning || (mode === "year" ? !selectedYear : !selectedGenre)
            }
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: "1.1rem",
              letterSpacing: "0.15em",
              padding: "14px 40px",
              background: spinning ? "var(--muted)" : "var(--rust)",
              color: "var(--cream)",
              border: "none",
              borderRadius: "2px",
              cursor: spinning ? "not-allowed" : "pointer",
              transition: "background 0.2s ease, transform 0.1s ease",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            {rollLabel}
          </button>

          {current && (
            <div
              style={{
                color: "var(--muted)",
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
              }}
            >
              #{current.position} on the all-time list
            </div>
          )}
        </div>

        {/* Album card */}
        {current && !spinning && (
          <div key={cardKey} className="fade-up">
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: "min(280px, 40%) 1fr" }}
            >
              {/* Left: cover */}
              <div>
                <AlbumCover
                  title={current.release_name}
                  artist={current.artist_name}
                />

                {/* Rating */}
                <div className="mt-4">
                  <StarRating rating={current.avg_rating} />
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.65rem",
                      marginTop: "4px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {current.rating_count.toLocaleString()} ratings
                  </div>
                </div>
              </div>

              {/* Right: info */}
              <div className="flex flex-col gap-5">
                {/* Release year stamp */}
                <div
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    fontSize: "5rem",
                    color: "transparent",
                    WebkitTextStroke: "2px var(--ink)",
                    lineHeight: 1,
                    opacity: 0.12,
                    userSelect: "none",
                    marginBottom: "-2rem",
                    marginTop: "-0.5rem",
                  }}
                >
                  {releaseYear}
                </div>

                <div>
                  <h2
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)",
                      color: "var(--ink)",
                      lineHeight: 1.15,
                    }}
                  >
                    {current.release_name}
                  </h2>
                  <div
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      fontStyle: "italic",
                      fontSize: "1.05rem",
                      color: "var(--rust)",
                      marginTop: "4px",
                    }}
                  >
                    {current.artist_name}
                  </div>
                </div>

                <div
                  className="flex gap-6"
                  style={{
                    borderTop: "1px solid rgba(26,20,16,0.12)",
                    paddingTop: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Released
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: "3px" }}>
                      {releaseFormatted}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Type
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        marginTop: "3px",
                        textTransform: "capitalize",
                      }}
                    >
                      {current.release_type}
                    </div>
                  </div>
                </div>

                {/* Genres */}
                {tags.length > 0 && (
                  <div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Genres
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "0.65rem",
                            letterSpacing: "0.06em",
                            padding: "4px 10px",
                            border: "1px solid var(--ink)",
                            borderRadius: "1px",
                            color: "var(--ink)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vibes */}
                {vibes.length > 0 && (
                  <div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Vibes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vibes.map((v) => (
                        <span
                          key={v}
                          style={{
                            fontSize: "0.65rem",
                            letterSpacing: "0.06em",
                            padding: "4px 10px",
                            background: "rgba(26,20,16,0.06)",
                            borderRadius: "1px",
                            color: "var(--muted)",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!current && !spinning && (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
            style={{ borderTop: "1px solid rgba(26,20,16,0.12)" }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "6rem",
                color: "transparent",
                WebkitTextStroke: "1px rgba(26,20,16,0.1)",
                lineHeight: 1,
                userSelect: "none",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {emptyLabel}
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                marginTop: "-0.5rem",
              }}
            >
              PRESS ROLL TO DISCOVER AN ALBUM
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
