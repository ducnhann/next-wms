import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import { useState } from "react";

/**
 * A custom React hook that provides both instant and debounced values for input handling.
 *
 * @template T - The type of the value being debounced
 * @param {T} initialValue - The initial value for both instant and debounced states
 * @param {number} [delay=100] - The debounce delay in milliseconds (default: 100ms)
 *
 * @returns {readonly [setValue: (value: T) => void, instantValue: T, debouncedValue: T]}
 * A tuple containing:
 * - `setValue`: Function to update both instant and debounced values
 * - `instantValue`: The current instant value (updates immediately)
 * - `debouncedValue`: The debounced value (updates after the specified delay)
 *
 * @example
 * ```tsx
 * const [setValue, instantValue, debouncedValue] = useDebouncedInput('', 300);
 *
 * // In your component
 * <input
 *   value={instantValue}
 *   onChange={(e) => setValue(e.target.value)}
 * />
 * ```
 */
export function useDebouncedInput<T>(
  initialValue: T,
  delay = 100,
): readonly [setValue: (value: T) => void, instantValue: T, debouncedValue: T] {
  const [instantValue, setInstantValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const setDebounced = useDebouncedCallback(setDebouncedValue, { wait: delay });

  const setValue = (value: T) => {
    setInstantValue(value);
    setDebounced(value);
  };

  return [setValue, instantValue, debouncedValue] as const;
}
