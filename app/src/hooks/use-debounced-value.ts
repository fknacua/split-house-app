import { useEffect, useState } from 'react';

/**
 * A copy of `value` that follows it only after it has stopped changing for `delayMs`. The value is
 * compared as JSON, so a new object with the same contents does not restart the wait. It must
 * survive `JSON.stringify` (plain objects, arrays, strings, numbers, booleans, null).
 *
 * @param value The live value, e.g. the form's values.
 * @param delayMs How long the value has to stay still, in milliseconds.
 * @returns The last value that stayed still for `delayMs` (the first value at the start).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const json = JSON.stringify(value);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(JSON.parse(json) as T), delayMs);
    return () => clearTimeout(timer);
  }, [json, delayMs]);

  return debounced;
}
