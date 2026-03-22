// =============================================================================
// store/zustandStore.js — Zustand State Management (Comparison with Redux)
// =============================================================================
// CONCEPT: Zustand vs Redux
//
//   Redux Toolkit:
//     ✅ Strict structure (slices, actions, reducers) — great for large teams
//     ✅ Devtools, time-travel debugging
//     ✅ RTK Query for data fetching
//     ❌ More boilerplate, steeper learning curve
//
//   Zustand:
//     ✅ Minimal API — define state and actions in ONE object
//     ✅ No providers, no boilerplate — just import and use
//     ✅ Works outside React (in utils, services)
//     ❌ Less structured — easy to misuse in large teams
//     ❌ No built-in devtools (though zustand/middleware has devtools support)
//
//   USE CASE HERE: We use Zustand for a "recently viewed posts" feature,
//   which is transient UI state — doesn't need Redux's full power.
//
//   Docs: https://docs.pmnd.rs/zustand/getting-started/introduction
// =============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

// =============================================================================
// RECENTLY VIEWED POSTS STORE
// =============================================================================
// CONCEPT: Zustand's create() takes a callback that receives set and get.
//   set(updater) — merges partial state (like setState in class components)
//   get()        — reads current state (useful inside actions)
//
// CONCEPT: persist middleware
//   Wraps the store to automatically save/restore from localStorage.
//   Same concept as what we did manually in the Redux bookmarks slice,
//   but Zustand makes it a one-liner middleware.
// =============================================================================
export const useRecentlyViewedStore = create(
  persist(
    (set, get) => ({
      // ========== STATE ==========
      recentPostIds: [],  // array of post IDs, newest first
      maxItems: 10,       // keep only last 10 viewed posts

      // ========== ACTIONS ==========
      // CONCEPT: In Zustand, actions are just functions in the same object as state.
      // No need for separate action creators or dispatch calls.

      addRecentPost: (postId) => {
        const { recentPostIds, maxItems } = get(); // read current state

        // CONCEPT: Array method chaining — functional style
        // filter() removes the ID if it already exists (avoid duplicates)
        // then we prepend with unshift pattern via spread
        const filtered = recentPostIds.filter((id) => id !== postId);
        const updated  = [postId, ...filtered].slice(0, maxItems); // keep max N items

        set({ recentPostIds: updated }); // merge into state (Zustand auto-merges)
      },

      clearRecentPosts: () => set({ recentPostIds: [] }),

      // CONCEPT: Derived/computed values as functions (not state)
      // In Zustand, you compute derived values in selectors, not stored in state.
      getRecentCount: () => get().recentPostIds.length,
    }),
    {
      name: "blog_recently_viewed",  // localStorage key
      // partialize: only persist recentPostIds, not functions
      partialize: (state) => ({ recentPostIds: state.recentPostIds }),
    }
  )
);

// =============================================================================
// UI STATE STORE — No persistence needed (resets on page load)
// =============================================================================
// CONCEPT: Zustand without persist — pure in-memory state
// Great for: modals, drawers, toast notifications, sidebar state
// =============================================================================
export const useUIStore = create((set) => ({
  // State
  sidebarOpen:    false,
  activeModal:    null,   // "login" | "register" | "newPost" | null
  toastMessage:   null,

  // Actions
  toggleSidebar:  () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal:      (name) => set({ activeModal: name }),
  closeModal:     ()     => set({ activeModal: null }),

  showToast: (message, duration = 3000) => {
    set({ toastMessage: message });
    // CONCEPT: setTimeout — web API for delayed execution
    // This is a side effect inside a Zustand action — fine here.
    setTimeout(() => set({ toastMessage: null }), duration);
  },
}));
