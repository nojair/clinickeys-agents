import { useState, useEffect } from "react";

/**
 * useDebounce - Retorna un valor debounced después de un delay.
 *
 * @param value   Valor a debouncificar
 * @param delay   Delay en ms
 * @returns       Valor debounced
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
