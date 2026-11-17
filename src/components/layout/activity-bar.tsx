"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * A thin bar along the bottom of the top bar while anything is loading or saving. It waits a moment
 * before showing, so quick requests don't flicker it.
 */
export function ActivityBar() {
  const busy = useIsFetching() + useIsMutating() > 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(busy), busy ? 200 : 0);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
      <div className={`activity-bar h-full w-1/3 bg-primary transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
