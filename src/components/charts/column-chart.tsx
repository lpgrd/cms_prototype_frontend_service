"use client";

import { useEffect, useState } from "react";

export interface ColumnDatum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

/**
 * Single-series column chart: one hue, ≤24px columns with a 4px rounded cap,
 * hairline gridlines, hover tooltip per column, and the latest value labelled directly.
 */
export function ColumnChart({
  data,
  format,
  height = 180,
  ariaLabel,
}: {
  data: ColumnDatum[];
  format: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // Columns rise from the baseline once on mount (skipped with reduced motion via motion-reduce).
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [0, 0.5, 1].map((t) => t * max);

  return (
    <figure aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="tabular absolute -top-2.5 left-0 bg-card pr-1 text-[10px] text-muted-foreground">{format(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-14 flex items-end">
          {data.map((d, i) => {
            const pct = (d.value / max) * 100;
            const last = i === data.length - 1;
            return (
              <div
                key={d.key}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full max-w-6 rounded-t bg-primary transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none"
                  style={{
                    height: grown ? `${pct}%` : 0,
                    minHeight: grown && d.value > 0 ? 2 : 0,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                    transitionDelay: grown && hover === null ? `${i * 60}ms` : "0ms",
                  }}
                />
                {last && d.value > 0 && hover === null && (
                  <span
                    className="tabular absolute text-xs font-medium whitespace-nowrap text-foreground"
                    style={{ bottom: `calc(${pct}% + 4px)` }}
                  >
                    {format(d.value)}
                  </span>
                )}
                {hover === i && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs whitespace-nowrap shadow-lg"
                    style={{ bottom: `calc(${pct}% + 8px)` }}
                  >
                    <div className="font-medium text-foreground">{d.label}</div>
                    <div className="tabular text-muted-foreground">{format(d.value)}</div>
                    {d.detail && <div className="text-muted-foreground">{d.detail}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 ml-14 flex">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center text-[11px] text-muted-foreground">
            {d.label}
          </div>
        ))}
      </div>
      {/* Tables ignore sr-only's 1px width, so the wrapper does the hiding. */}
      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th>{d.label}</th>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
