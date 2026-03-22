// =============================================================================
// features/theme/themeSlice.js — Dark/Light Theme Redux Slice
// =============================================================================

import { createSlice } from "@reduxjs/toolkit";

const getInitialTheme = () => {
  // Check localStorage first, then OS preference
  const stored = localStorage.getItem("blog_theme");
  if (stored) return stored;

  // CONCEPT: matchMedia — query CSS media features from JavaScript
  // prefers-color-scheme reflects the user's OS dark/light mode setting
  // Docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    mode: getInitialTheme(), // "dark" | "light"
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("blog_theme", state.mode);

      // Sync with <html> element for CSS class-based theming
      document.documentElement.setAttribute("data-theme", state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("blog_theme", state.mode);
      document.documentElement.setAttribute("data-theme", state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const selectThemeMode = (state) => state.theme.mode;
export default themeSlice.reducer;
