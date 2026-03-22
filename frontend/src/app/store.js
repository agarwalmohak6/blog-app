// =============================================================================
// app/store.js — Redux Store Configuration
// =============================================================================
// CONCEPT: Redux Store
//   The store is a single JS object tree that holds ALL your application state.
//   "Single source of truth" — one place for all state means:
//     - Easy debugging (snapshot state at any time)
//     - Predictable state changes (only via reducers/actions)
//     - Powerful devtools (time-travel debugging!)
//
//   Redux Toolkit (RTK) is the OFFICIAL way to write Redux.
//   It eliminates the boilerplate of classic Redux (action types, action creators,
//   switch statements) and includes Immer.js for "mutating" state safely.
//
//   Docs: https://redux-toolkit.js.org/introduction/getting-started
// =============================================================================

import { configureStore } from "@reduxjs/toolkit";
import { postsApi } from "../features/posts/postsApi";
import bookmarksReducer from "../features/bookmarks/bookmarksSlice";
import themeReducer from "../features/theme/themeSlice";
import authReducer from "../features/auth/authSlice";

// =============================================================================
// configureStore — Sets up the Redux store with sensible defaults
// =============================================================================
// What configureStore does for you automatically:
//   ✅ Combines reducers (replaces combineReducers)
//   ✅ Adds Redux DevTools Extension support
//   ✅ Adds redux-thunk middleware (for async actions)
//   ✅ Adds Immer (so you can "mutate" state in reducers safely)
//   ✅ Development-mode checks for common mistakes
//
// Docs: https://redux-toolkit.js.org/api/configureStore
// =============================================================================
export const store = configureStore({
  reducer: {
    // CONCEPT: Each key here becomes a "slice" of global state.
    // store.getState() returns: { bookmarks: {...}, theme: {...}, auth: {...}, postsApi: {...} }

    bookmarks: bookmarksReducer,  // manages bookmarked post IDs
    theme:     themeReducer,      // manages dark/light theme
    auth:      authReducer,       // manages JWT token + current user

    // CONCEPT: RTK Query auto-generates a reducer and middleware.
    // The key MUST match the reducerPath defined in postsApi.
    [postsApi.reducerPath]: postsApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    // CONCEPT: getDefaultMiddleware() returns RTK's built-in middleware array.
    // We .concat() RTK Query's middleware which handles:
    //   - Caching API responses
    //   - Invalidating cache when mutations happen
    //   - Automatic re-fetching
    // Don't use spread [...getDefaultMiddleware(), ...] — concat is safer with TypeScript
    getDefaultMiddleware().concat(postsApi.middleware),
});

// =============================================================================
// TYPE HELPERS (optional but great for scale)
// CONCEPT: These exported types are used throughout the app for typed selectors/dispatch.
// Docs: https://redux-toolkit.js.org/tutorials/typescript
// =============================================================================
// export type RootState = ReturnType<typeof store.getState>
// export type AppDispatch = typeof store.dispatch
