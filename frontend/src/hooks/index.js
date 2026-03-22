// =============================================================================
// hooks/useDebounce.js — Debounce Custom Hook
// =============================================================================
// CONCEPT: Debouncing
//   Without debounce: typing "react" fires 5 API calls (r, re, rea, reac, react)
//   With debounce: only fires 1 API call 300ms AFTER the user stops typing
//
//   Debounce delays execution until a "quiet period" after the last call.
//   Throttle (different!) limits to at most 1 call per time window.
//
//   Use debounce for: search inputs, window resize handlers, form validation
//   Use throttle for: scroll events, mousemove, rate limiting API calls
//
//   Docs: https://developer.mozilla.org/en-US/docs/Glossary/Debounce
// =============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export function useDocumentMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;

    if (!description) return undefined;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    return () => {
      if (meta?.content === description) meta.content = "";
    };
  }, [title, description]);
}

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // CONCEPT: useEffect Cleanup Function
    // The function returned from useEffect runs BEFORE the next effect call
    // and on component unmount. Here, we cancel the previous timer.
    // Without this: old timers would fire and cause stale state updates.
    return () => clearTimeout(timer);

    // Effect re-runs whenever value or delay changes
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// hooks/useIntersectionObserver.js — Infinite Scroll Hook
// =============================================================================
// CONCEPT: IntersectionObserver API
//   A browser API that fires a callback when an element enters/exits the viewport.
//   Use cases: infinite scroll, lazy image loading, analytics (did user see this?)
//
//   How infinite scroll works:
//   1. Put an invisible sentinel element at the bottom of your list
//   2. Observe it with IntersectionObserver
//   3. When it becomes visible, load the next page
//
//   Much more performant than listening to scroll events + calculating offsets!
//   Docs: https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
// =============================================================================

export function useIntersectionObserver(options = {}) {
  // CONCEPT: useRef — persists a value across renders WITHOUT causing re-renders
  // Perfect for: DOM element refs, timer IDs, observer instances
  // Changing ref.current does NOT trigger a re-render
  const ref = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    // Guard: if the ref isn't attached to a DOM element yet, do nothing
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      // CONCEPT: Callback receives entries — one per observed element
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        // threshold: 0 = fires when ANY part enters viewport
        // threshold: 1 = fires only when FULLY visible
        threshold: options.threshold ?? 0,
        rootMargin: options.rootMargin ?? "0px", // extend/shrink the detection area
      }
    );

    observer.observe(ref.current);

    // Cleanup: disconnect observer when component unmounts or ref changes
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return [ref, isIntersecting];
}

// =============================================================================
// hooks/useLocalStorage.js — Synced localStorage Hook
// =============================================================================
// CONCEPT: Custom hooks encapsulate stateful logic for reuse.
// This hook wraps localStorage with useState so:
//   - Reading is reactive (triggers re-renders)
//   - Writing updates both localStorage AND React state in sync
//
// This is the same pattern React's useState uses, but persisted.
// =============================================================================

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    // CONCEPT: Lazy initializer for useState
    // Pass a function to useState when the initial value is expensive to compute.
    // The function runs ONCE on mount, not on every render.
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      // CONCEPT: Functional update pattern
      // Pass a function to updater so it receives the latest state,
      // avoiding stale closure issues
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`[useLocalStorage] Error saving key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// =============================================================================
// hooks/useFetch.js — Generic Fetch Hook with AbortController
// =============================================================================
// CONCEPT: AbortController
//   When a component unmounts mid-fetch (user navigates away), the fetch still
//   completes and tries to set state on an unmounted component — memory leak!
//
//   AbortController lets you cancel in-flight fetch requests:
//   1. Create an AbortController
//   2. Pass its signal to fetch()
//   3. On cleanup, call abort() — fetch() throws an AbortError (which we ignore)
//
//   Docs: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
// =============================================================================

export function useFetch(url, options = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // CONCEPT: useCallback + dependency array
  // Memoizes the fetch function — only recreates if url/options change.
  // Without this, the function would be a new reference every render,
  // causing the useEffect below to run on every render (infinite loop risk).
  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, { ...options, signal });

      // CONCEPT: Check for HTTP errors — fetch() only rejects on network failure,
      // NOT on 4xx/5xx responses. You must check res.ok manually.
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      // CONCEPT: AbortError is expected — don't treat it as a real error
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      // finally always runs — great for cleanup regardless of success/error
      setLoading(false);
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!url) return;

    // Create a new AbortController for this fetch
    const controller = new AbortController();
    fetchData(controller.signal);

    // Cleanup: abort the request if component unmounts or url changes
    return () => controller.abort();
  }, [url, fetchData]);

  return { data, loading, error, refetch: () => fetchData(new AbortController().signal) };
}

// =============================================================================
// hooks/useThrottle.js — Throttle Custom Hook
// =============================================================================
// CONCEPT: Throttle vs Debounce
//   Debounce: wait until user STOPS, then fire ONCE
//   Throttle: fire at most ONCE per interval, even if called many times
//
//   Throttle example: scroll handler — fire at most every 100ms,
//   not 60 times per second as the user scrolls
// =============================================================================

export function useThrottle(value, interval = 200) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now()); // timestamp of last update

  useEffect(() => {
    const now = Date.now();
    const timeSinceLast = now - lastUpdated.current;

    if (timeSinceLast >= interval) {
      // Enough time has passed — update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Too soon — schedule update for when the interval expires
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLast);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}
