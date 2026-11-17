import { Gem } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A hallmark-style stamp: concentric rings, a phrase around the rim, a gem at the centre.
 * Presses in once on mount (only when the user allows motion).
 */
export function HallmarkStamp({ text, className }: { text: string; className?: string }) {
  const rim = useId();
  return (
    <div
      className={cn(
        "relative size-40 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in-0 motion-safe:zoom-in-110",
        className,
      )}
    >
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <path id={rim} d="M 80,80 m -62,0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0" />
        </defs>
        <circle cx="80" cy="80" r="78" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="80" cy="80" r="71" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="80" cy="80" r="48" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        {/* textLength = rim circumference (2π × 62 ≈ 389) so the words close the circle evenly. */}
        <text fontSize="10" fill="currentColor" fillOpacity="0.8">
          <textPath href={`#${rim}`} textLength="386" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Gem className="size-12" strokeWidth={1.25} aria-hidden />
      </div>
    </div>
  );
}
