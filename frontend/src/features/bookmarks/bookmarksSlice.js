// =============================================================================
// features/bookmarks/bookmarksSlice.js — Redux Slice for Bookmarks
// =============================================================================
// CONCEPT: Redux Slice (createSlice)
//   A "slice" combines: initial state + reducers + action creators in one place.
//   RTK's createSlice uses Immer.js under the hood, which lets you write
//   "mutating" code (state.ids.push(...)) that is actually SAFE and IMMUTABLE.
//   Immer intercepts the mutations and produces a new immutable state object.
//
//   Classic Redux required you to spread manually:
//     return { ...state, ids: [...state.ids, action.payload] }  // verbose!
//
//   With RTK + Immer:
//     state.ids.push(action.payload)  // looks mutable, but it's safe! ✅
//
//   Docs: https://redux-toolkit.js.org/api/createSlice
//   Immer: https://immerjs.github.io/immer/
// =============================================================================

import { createSlice } from "@reduxjs/toolkit";

// =============================================================================
// INITIAL STATE
// =============================================================================
// CONCEPT: We load bookmarks from localStorage on app start.
// This persists bookmarks across browser sessions.
// localStorage is synchronous and stores strings only — JSON.parse to restore.
// =============================================================================
const loadBookmarksFromStorage = () => {
  try {
    const stored = localStorage.getItem("blog_bookmarks");
    // CONCEPT: Nullish coalescing (??) — use right side only if left is null/undefined
    // Unlike || which also triggers for "", 0, false (falsy values)
    return JSON.parse(stored) ?? [];
  } catch {
    return []; // corrupted storage — start fresh
  }
};

const initialState = {
  // Array of bookmarked post IDs (just the IDs, not the full post data)
  // Full post data lives in RTK Query cache — avoids duplication
  ids: loadBookmarksFromStorage(),
};

// =============================================================================
// SLICE DEFINITION
// =============================================================================
const bookmarksSlice = createSlice({
  name: "bookmarks",  // action type prefix: "bookmarks/toggleBookmark"

  initialState,

  reducers: {
    // =========================================================================
    // toggleBookmark — Add if not bookmarked, remove if already bookmarked
    // =========================================================================
    // CONCEPT: Immer makes this look like mutation but it's actually immutable.
    // The `state` parameter here is an Immer "draft" — not the real state object.
    // =========================================================================
    toggleBookmark: (state, action) => {
      const postId = action.payload; // the post ID passed to dispatch()

      const index = state.ids.indexOf(postId);

      if (index === -1) {
        // Not bookmarked — add it
        state.ids.push(postId);
      } else {
        // Already bookmarked — remove it
        // splice(index, 1) removes 1 element at `index`
        state.ids.splice(index, 1);
      }

      // CONCEPT: Side effects in reducers
      // Reducers should be pure functions (no side effects).
      // However, localStorage sync is often done here for simplicity.
      // For strict purity, use Redux middleware or listeners instead.
      // RTK Listener Middleware: https://redux-toolkit.js.org/api/createListenerMiddleware
      localStorage.setItem("blog_bookmarks", JSON.stringify(state.ids));
    },

    clearBookmarks: (state) => {
      state.ids = [];
      localStorage.removeItem("blog_bookmarks");
    },
  },
});

// Export action creators (generated automatically by createSlice)
export const { toggleBookmark, clearBookmarks } = bookmarksSlice.actions;

// =============================================================================
// SELECTORS
// =============================================================================
// CONCEPT: Selectors are functions that extract and derive data from Redux state.
// They live close to the slice (co-location pattern).
//
// CONCEPT: Memoized Selectors with createSelector (reselect)
// Plain selectors recompute on EVERY render — even if state hasn't changed.
// createSelector memoizes: only recomputes when inputs change.
//
// Without memoization:
//   selectBookmarkCount = state => state.bookmarks.ids.length
//   → recalculates every render, even if bookmarks haven't changed
//
// With memoization (createSelector):
//   → only recalculates when state.bookmarks.ids changes
//   → pure performance win for derived/computed values
//
// Docs: https://reselect.js.org/ (built into RTK)
// =============================================================================
import { createSelector } from "@reduxjs/toolkit";

// Input selector — selects raw data from state
const selectBookmarkIds = (state) => state.bookmarks.ids;

// Memoized derived selector — computes bookmark count
export const selectBookmarkCount = createSelector(
  [selectBookmarkIds],
  (ids) => ids.length  // only recalculates when ids array changes
);

// Memoized selector factory — checks if a specific post is bookmarked
// CONCEPT: Selector factory pattern — returns a new selector per postId
// so each component gets its own memoized selector instance
export const selectIsBookmarked = (postId) =>
  createSelector(
    [selectBookmarkIds],
    (ids) => ids.includes(postId)
  );

// Plain selector (no memoization needed for simple reads)
export const selectAllBookmarkIds = (state) => state.bookmarks.ids;

export default bookmarksSlice.reducer;
