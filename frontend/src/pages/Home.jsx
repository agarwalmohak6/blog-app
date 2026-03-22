// =============================================================================
// pages/Home.jsx — Blog Home Page
// =============================================================================
// This page demonstrates:
//   ✅ useTransition — non-blocking search UI updates
//   ✅ useDeferredValue — deferred rendering for heavy lists
//   ✅ useId — accessible form element IDs
//   ✅ RTK Query (useGetPostsQuery) — data fetching with caching
//   ✅ useDebounce — prevent excessive API calls while typing
//   ✅ useIntersectionObserver — infinite scroll
//   ✅ useSelector / useDispatch — reading and updating Redux state
// =============================================================================

import {
  useState,
  useTransition,
  useDeferredValue,
  useId,
  useCallback,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetPostsQuery } from "../features/posts/postsApi";
import { toggleBookmark, selectIsBookmarked } from "../features/bookmarks/bookmarksSlice";
import { useDebounce, useIntersectionObserver } from "../hooks";
import { useRecentlyViewedStore } from "../store/zustandStore";
import PostCard from "../components/PostCard";
import { SearchBar } from "../components";

// =============================================================================
// CATEGORIES — defined outside component to avoid recreation on each render
// CONCEPT: Module-level constants are created ONCE and shared across renders.
// If defined inside the component, a new array would be created every render,
// breaking referential equality checks in useMemo/useCallback dependencies.
// =============================================================================
const CATEGORIES = ["Technology", "Science", "Health", "Business", "Culture", "Other"];

export default function Home() {
  const dispatch = useDispatch();

  // ===========================================================================
  // LOCAL STATE
  // ===========================================================================
  const [searchInput, setSearchInput]     = useState("");
  const [selectedCategory, setCategory]  = useState("");
  const [page, setPage]                  = useState(1);

  // CONCEPT: useTransition
  // Marks a state update as "non-urgent" so React can interrupt it to
  // handle more urgent updates (like user typing).
  //
  // Without useTransition: typing in search box feels laggy if the list re-render is slow
  // With useTransition: typing stays snappy; list update is deferred as "transition"
  //
  // isPending: true while the transition is in progress (show a subtle loading indicator)
  //
  // Docs: https://react.dev/reference/react/useTransition
  const [isPending, startTransition] = useTransition();

  // CONCEPT: useDeferredValue
  // Similar to useTransition but for VALUES instead of state updates.
  // React renders with the OLD value first (snappy), then re-renders with new value.
  // The deferred render runs at lower priority than the urgent render.
  //
  // Use useTransition when you control the state update (have the setState call)
  // Use useDeferredValue when you receive the value as a prop or can't wrap the setter
  //
  // Docs: https://react.dev/reference/react/useDeferredValue
  const deferredSearch = useDeferredValue(searchInput);

  // CONCEPT: useId
  // Generates a stable, unique ID that's consistent between server and client renders.
  // Perfect for linking <label htmlFor> with <input id> — accessibility best practice.
  // Never use Math.random() or counter variables for IDs — breaks SSR hydration.
  //
  // Docs: https://react.dev/reference/react/useId
  const searchId   = useId();
  const categoryId = useId();

  // ===========================================================================
  // DEBOUNCE — delay API call until user stops typing
  // ===========================================================================
  // CONCEPT: We debounce the search BEFORE sending it to RTK Query.
  // searchInput updates instantly (controlled input stays responsive).
  // debouncedSearch only updates 400ms after the last keystroke.
  // RTK Query uses debouncedSearch — so the API is only called after typing stops.
  const debouncedSearch = useDebounce(deferredSearch, 400);

  // ===========================================================================
  // RTK QUERY — fetch posts
  // ===========================================================================
  // CONCEPT: useGetPostsQuery returns:
  //   data     → the API response (PostListResponse schema)
  //   isLoading → true on the FIRST fetch (no cached data)
  //   isFetching → true on any fetch (including background refetch)
  //   error    → error object if request failed
  //   refetch  → function to manually trigger a refetch
  //
  // RTK Query automatically re-runs the query when arguments change (debouncedSearch, selectedCategory, page)
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useGetPostsQuery({
    page,
    limit: 10,
    search: debouncedSearch,
    category: selectedCategory,
  });

  // ===========================================================================
  // ZUSTAND — recently viewed (read-only here)
  // ===========================================================================
  // CONCEPT: Zustand hook — just call it like useState.
  // No Provider needed, no useSelector/useDispatch — much simpler API.
  const recentIds = useRecentlyViewedStore((state) => state.recentPostIds);

  // ===========================================================================
  // INFINITE SCROLL SENTINEL
  // ===========================================================================
  // CONCEPT: We put an invisible div at the bottom of the list.
  // When it scrolls into view, we load the next page.
  const [sentinelRef, isSentinelVisible] = useIntersectionObserver({
    threshold: 0.1,       // fires when 10% of the sentinel is visible
    rootMargin: "100px",  // fire 100px BEFORE it actually enters viewport (pre-load)
  });

  // Load next page when sentinel becomes visible and there are more posts
  // useCallback: memoize so it's not recreated on every render
  const loadMore = useCallback(() => {
    if (data?.has_more && !isFetching) {
      startTransition(() => {
        // CONCEPT: Functional state update — always uses latest state
        // Avoids stale closure where page might be outdated
        setPage((prev) => prev + 1);
      });
    }
  }, [data?.has_more, isFetching]);

  // Effect: trigger loadMore when sentinel enters viewport
  // (We call this in the render, not a useEffect, since isSentinelVisible triggers re-render)
  if (isSentinelVisible) loadMore();

  // ===========================================================================
  // DERIVED STATE with useMemo
  // ===========================================================================
  // CONCEPT: useMemo
  // Memoizes an expensive computation — only recomputes when dependencies change.
  // Here, we highlight recent posts by merging the posts list with recentIds.
  // Without useMemo, this would recompute on EVERY render (wasteful).
  //
  // Rule of thumb: use useMemo when the computation is expensive OR
  // when you need referential equality for child component props.
  //
  // Docs: https://react.dev/reference/react/useMemo
  const postsWithRecentFlag = useMemo(() => {
    if (!data?.posts) return [];
    // CONCEPT: Array.map + Set for O(1) lookup instead of O(n) includes()
    const recentSet = new Set(recentIds);
    return data.posts.map((post) => ({
      ...post,                                // spread operator — shallow copy
      isRecentlyViewed: recentSet.has(post.id),
    }));
  }, [data?.posts, recentIds]);

  // ===========================================================================
  // SEARCH HANDLER
  // ===========================================================================
  const handleSearchChange = (value) => {
    setSearchInput(value); // instant update for input
    startTransition(() => {
      setPage(1); // reset to page 1 on new search — wrapped in transition (non-urgent)
    });
  };

  const handleCategoryChange = (cat) => {
    // CONCEPT: Conditional (ternary) — toggle category if already selected
    startTransition(() => {
      setCategory((prev) => (prev === cat ? "" : cat));
      setPage(1);
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================
  if (isLoading) return <div className="loading">Loading posts...</div>;
  if (error)     return <div className="error">Failed to load posts. {error.message}</div>;

  return (
    <div className="home">
      <div className="home__header">
        <h1 className="home__title">The Blog</h1>
        <p className="home__subtitle">Thoughts, ideas, and stories</p>
      </div>

      {/* Search Bar */}
      <div className="home__controls">
        {/* CONCEPT: htmlFor + useId — links label to input for accessibility.
            Screen readers announce the label when the input is focused. */}
        <label htmlFor={searchId} className="sr-only">Search posts</label>
        <SearchBar
          id={searchId}
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search posts..."
        />

        {/* Category filter pills */}
        <div className="home__categories" role="group" aria-labelledby={categoryId}>
          <span id={categoryId} className="sr-only">Filter by category</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => handleCategoryChange(cat)}
              aria-pressed={selectedCategory === cat}  // accessibility: toggle state
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* CONCEPT: isPending from useTransition — show subtle indicator while transition runs */}
      {isPending && (
        <div className="home__pending" aria-live="polite">
          Updating results...
        </div>
      )}

      {/* Post Grid */}
      <div className="home__posts">
        {postsWithRecentFlag.length === 0 ? (
          <div className="empty-state">
            <p>No posts found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}.</p>
          </div>
        ) : (
          postsWithRecentFlag.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isRecentlyViewed={post.isRecentlyViewed}
            />
          ))
        )}
      </div>

      {/* Pagination info */}
      {data && (
        <p className="home__count">
          Showing {data.posts.length} of {data.total} posts
        </p>
      )}

      {/* Infinite scroll sentinel — invisible div at the bottom */}
      {data?.has_more && (
        <div
          ref={sentinelRef}
          className="scroll-sentinel"
          aria-hidden="true"   // hidden from screen readers
          style={{ height: "1px", marginTop: "2rem" }}
        />
      )}

      {isFetching && !isLoading && (
        <div className="loading loading--inline">Loading more...</div>
      )}
    </div>
  );
}
