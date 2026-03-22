// =============================================================================
// components/SearchBar.jsx
// =============================================================================
// CONCEPT: Controlled component with forwardRef
// forwardRef allows the parent to pass a ref to this component's inner input.
// Useful when the parent needs to imperatively focus/blur the input.
// Docs: https://react.dev/reference/react/forwardRef
// =============================================================================

import { forwardRef } from "react";

export const SearchBar = forwardRef(function SearchBar(
  { value, onChange, placeholder = "Search...", id, ...rest },
  ref
) {
  return (
    <div className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">🔍</span>
      <input
        ref={ref}
        id={id}
        type="search"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        // CONCEPT: aria-label here would be redundant if a <label> element
        // with htmlFor is already pointing to this input (via useId in parent)
        {...rest}  // CONCEPT: Rest/spread — pass through any extra props
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
});

export default SearchBar;


// =============================================================================
// components/CommentSection.jsx
// =============================================================================
// Renders a list of comments, including optimistic ones.
// =============================================================================

export function CommentSection({ comments, isLoading }) {
  if (isLoading) return <div className="loading">Loading comments...</div>;

  if (!comments?.length) {
    return (
      <div className="empty-state">
        <p>No comments yet. Be the first!</p>
      </div>
    );
  }

  return (
    <ul className="comment-list" aria-label="Comments list">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className={`comment ${comment._isOptimistic ? "comment--optimistic" : ""}`}
          // CONCEPT: Optimistic comments have _isOptimistic flag
          // We style them differently (e.g. opacity: 0.7) to indicate "pending"
        >
          <div className="comment__header">
            <strong className="comment__author">
              {/* CONCEPT: Optional chaining + nullish coalescing
                  comment.author?.username — safe access (won't throw if author is null)
                  ?? "Anonymous"         — fallback if result is null/undefined */}
              {comment.author?.username ?? "Anonymous"}
            </strong>
            <time className="comment__date">
              {comment._isOptimistic
                ? "Posting..."
                : new Date(comment.created_at).toLocaleDateString()}
            </time>
          </div>
          <p className="comment__body">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}


// =============================================================================
// components/ThemeToggle.jsx
// =============================================================================

import { useSelector, useDispatch } from "react-redux";
import { toggleTheme, selectThemeMode } from "../features/theme/themeSlice";

export function ThemeToggle() {
  const dispatch = useDispatch();
  const mode     = useSelector(selectThemeMode);
  const isDark   = mode === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={() => dispatch(toggleTheme())}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* CONCEPT: Short-circuit evaluation
          isDark && "🌙"  — renders emoji only if isDark is true
          !isDark && "☀️" — renders emoji only if isDark is false */}
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}


// =============================================================================
// components/Navbar.jsx
// =============================================================================
// CONCEPT: useSelector multiple times — each call subscribes separately,
// so the component only re-renders when the specific slice of state changes.
// Docs: https://react-redux.js.org/api/hooks#useselector
// =============================================================================

import { Link, NavLink, useNavigate } from "react-router-dom";
import { selectIsLoggedIn, selectCurrentUser, logout } from "../features/auth/authSlice";
import { selectBookmarkCount } from "../features/bookmarks/bookmarksSlice";

export function Navbar() {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const isLoggedIn   = useSelector(selectIsLoggedIn);
  const currentUser  = useSelector(selectCurrentUser);
  const bookmarkCount = useSelector(selectBookmarkCount);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar__brand">
        📝 The Blog
      </Link>

      <div className="navbar__links">
        {/* CONCEPT: NavLink — like Link but adds active class when route matches
            Useful for highlighting the current page in navigation */}
        <NavLink
          to="/"
          className={({ isActive }) => `navbar__link ${isActive ? "active" : ""}`}
          end  // "end" means only match EXACTLY "/" not "/posts/123"
        >
          Posts
        </NavLink>

        <NavLink
          to="/bookmarks"
          className={({ isActive }) => `navbar__link ${isActive ? "active" : ""}`}
        >
          Bookmarks
          {/* Bookmark count badge */}
          {bookmarkCount > 0 && (
            <span className="navbar__badge">{bookmarkCount}</span>
          )}
        </NavLink>

        {isLoggedIn && (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `navbar__link ${isActive ? "active" : ""}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/new-post"
              className={({ isActive }) => `navbar__link ${isActive ? "active" : ""}`}
            >
              + New Post
            </NavLink>
          </>
        )}

        <NavLink
          to="/archives"
          className={({ isActive }) => `navbar__link ${isActive ? "active" : ""}`}
        >
          Archives
        </NavLink>
      </div>

      <div className="navbar__actions">
        <ThemeToggle />

        {isLoggedIn ? (
          <div className="navbar__user">
            <span className="navbar__username">
              @{currentUser?.username}
            </span>
            <button
              className="btn btn--ghost btn--small"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn--primary btn--small">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
