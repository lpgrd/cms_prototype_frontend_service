import { useEffect, useState } from "react";

/** The value, once it has stopped changing for `ms`: so a preview is not recomputed on every keystroke. */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
