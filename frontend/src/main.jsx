// =============================================================================
// main.jsx — Application Entry Point
// =============================================================================
// CONCEPT: ReactDOM.createRoot (React 18)
//   The new root API enables concurrent features (useTransition, useDeferredValue).
//   React 17 used ReactDOM.render() — sync, no concurrent features.
//   React 18 uses createRoot().render() — opt into concurrent mode.
//   Docs: https://react.dev/blog/2022/03/29/react-v18
// =============================================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// CONCEPT: StrictMode
// Wrapping in <StrictMode> enables extra development-time checks:
//   - Renders components TWICE to detect side effects in render
//   - Warns about deprecated APIs
//   - Warns about unexpected side effects
// StrictMode has NO effect in production builds.
// Docs: https://react.dev/reference/react/StrictMode
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
