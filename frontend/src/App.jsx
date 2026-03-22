// =============================================================================
// App.jsx — Root Component with React Router v6
// =============================================================================
// CONCEPT: React Router v6 — Declarative Routing
//   Routes are defined as JSX. React Router matches the URL to a <Route>
//   and renders its element. Nested routes inherit parent layout.
//
//   Key v6 features used here:
//     - <Routes> (replaces <Switch>)
//     - <Route element={...}> (replaces <Route component={...}>)
//     - Lazy loading with React.lazy + <Suspense>
//     - Layout routes (Outlet pattern)
//     - Protected routes
//
//   Docs: https://reactrouter.com/en/main/start/overview
// =============================================================================

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./app/store";
import { fetchCurrentUser, selectCurrentUser, selectIsLoggedIn } from "./features/auth/authSlice";
import { selectThemeMode } from "./features/theme/themeSlice";
import { Navbar } from "./components/index.jsx";

// =============================================================================
// CONCEPT: Code Splitting with React.lazy + Suspense
//
//   By default, ALL your JS is bundled into one file.
//   For large apps this means a big initial download even for pages the user
//   might never visit.
//
//   React.lazy() lets you split each page into its own JS chunk.
//   The chunk is only downloaded when the user navigates to that route.
//
//   <Suspense fallback={...}> shows a fallback while the chunk is loading.
//
//   Webpack/Vite automatically splits code at these lazy() boundaries.
//   Docs: https://react.dev/reference/react/lazy
// =============================================================================
const Home       = lazy(() => import("./pages/Home"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Login      = lazy(() => import("./pages/Login"));
const Bookmarks  = lazy(() => import("./pages/Bookmarks"));
const NewPost    = lazy(() => import("./pages/NewPost"));
const EditPost   = lazy(() => import("./pages/EditPost"));
const Dashboard  = lazy(() => import("./pages/Dashboard"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const Archives   = lazy(() => import("./pages/Archives"));
const TagPosts   = lazy(() => import("./pages/TagPosts"));

// =============================================================================
// LAYOUT ROUTE — Shared layout wrapper
// =============================================================================
// CONCEPT: Layout Routes (Outlet pattern)
// <Outlet /> renders the matched child route's element.
// This lets you wrap all pages in a shared layout (Navbar, footer, etc.)
// without repeating the layout in every page component.
//
// Docs: https://reactrouter.com/en/main/components/outlet
// =============================================================================
function RootLayout() {
  const dispatch = useDispatch();
  const themeMode = useSelector(selectThemeMode);
  const currentUser = useSelector(selectCurrentUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  // Sync theme to <html> data-theme attribute for CSS variable switching
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (isLoggedIn && !currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isLoggedIn, currentUser]);

  return (
    <div className="app" data-theme={themeMode}>
      <Navbar />
      <main className="app__main">
        {/* Child routes render here */}
        <Outlet />
      </main>
      <footer className="app__footer">
        <p>Blog App — built with React 18 + FastAPI</p>
      </footer>
    </div>
  );
}

// =============================================================================
// PROTECTED ROUTE — Redirect unauthenticated users
// =============================================================================
// CONCEPT: Protected Route Pattern
// A wrapper component that checks auth and redirects to /login if not logged in.
// This is a common pattern — NOT a React Router built-in feature.
// We compose it using Navigate (declarative redirect).
//
// Alternative: Use React Router's loader functions for data fetching + auth checks.
// Docs: https://reactrouter.com/en/main/route/loader
// =============================================================================
function ProtectedRoute({ children }) {
  const isLoggedIn = useSelector(selectIsLoggedIn);

  if (!isLoggedIn) {
    // CONCEPT: <Navigate replace> — redirects without adding to browser history
    // `replace` means the /login page replaces the current history entry
    // so the user can't press "Back" to get back to the protected page
    return <Navigate to="/login" replace />;
  }

  return children;
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================
function PageLoader() {
  return (
    <div className="page-loader" aria-live="polite" aria-busy="true">
      <div className="page-loader__spinner" />
      <p>Loading page...</p>
    </div>
  );
}

// =============================================================================
// APP ROUTER
// =============================================================================
function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Suspense catches lazy-loaded routes and shows fallback while loading */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Layout Route — wraps all child routes in RootLayout */}
          <Route path="/" element={<RootLayout />}>

            {/* Public routes */}
            <Route index element={<Home />} />                  {/* matches "/" exactly */}
            <Route path="posts/:postId" element={<PostDetail />} />
            <Route path="p/:slug" element={<PostDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="authors/:username" element={<AuthorProfile />} />
            <Route path="tags/:tag" element={<TagPosts />} />
            <Route path="archives" element={<Archives />} />

            {/* Protected routes */}
            <Route
              path="new-post"
              element={
                <ProtectedRoute>
                  <NewPost />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-post/:postId"
              element={
                <ProtectedRoute>
                  <EditPost />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* CONCEPT: Catch-all route — matches anything not matched above
                Must be LAST. The "*" wildcard matches any path. */}
            <Route
              path="*"
              element={
                <div className="not-found">
                  <h1>404 — Page Not Found</h1>
                  <p><a href="/">Go home</a></p>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// =============================================================================
// ROOT APP — Redux Provider wraps everything
// =============================================================================
// CONCEPT: Redux Provider
// Makes the Redux store available to ALL components in the tree via context.
// Without Provider, useSelector/useDispatch won't work.
// The Provider should be as HIGH as possible in the component tree.
// Docs: https://react-redux.js.org/api/provider
// =============================================================================
export default function App() {
  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}
