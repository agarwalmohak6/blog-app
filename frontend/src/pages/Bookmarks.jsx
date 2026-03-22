// =============================================================================
// pages/Bookmarks.jsx — Saved / Bookmarked Posts
// =============================================================================
// Demonstrates:
//   ✅ useSelector with memoized selectors (reselect)
//   ✅ RTK Query — fetching individual posts by ID
//   ✅ useMemo — deriving display data from Redux state
// =============================================================================

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  selectAllBookmarkIds,
  selectBookmarkCount,
  clearBookmarks,
  toggleBookmark,
} from "../features/bookmarks/bookmarksSlice";
import { useGetPostQuery } from "../features/posts/postsApi";
import { getPostPath } from "../utils/postRoutes";

// =============================================================================
// BookmarkedPost — fetches and displays a single bookmarked post
// =============================================================================
// CONCEPT: Component-per-item pattern
// Each BookmarkedPost independently fetches its own data via RTK Query.
// RTK Query caches results — if the post was already loaded on the Home page,
// this is a cache HIT (no network request, instant render).
// This is the "normalized cache" advantage of RTK Query.
// =============================================================================
function BookmarkedPost({ postId }) {
  const dispatch = useDispatch();
  const { data: post, isLoading } = useGetPostQuery(postId);

  if (isLoading) return <div className="bookmark-card bookmark-card--loading">Loading...</div>;
  if (!post)     return null;

  return (
    <div className="bookmark-card">
      <div className="bookmark-card__content">
        {post.category && (
          <span className="bookmark-card__category">{post.category}</span>
        )}
        <h3 className="bookmark-card__title">
          <Link to={getPostPath(post)}>{post.title}</Link>
        </h3>
        <p className="bookmark-card__excerpt">
          {/* CONCEPT: Optional chaining + substring for safe string slicing */}
          {post.body?.substring(0, 120)}...
        </p>
        <div className="bookmark-card__meta">
          {post.author && <span>by {post.author.username}</span>}
        </div>
      </div>
      <button
        className="bookmark-card__remove"
        onClick={() => dispatch(toggleBookmark(postId))}
        aria-label={`Remove bookmark for "${post.title}"`}
        title="Remove bookmark"
      >
        ✕
      </button>
    </div>
  );
}

// =============================================================================
// Bookmarks Page
// =============================================================================
export default function Bookmarks() {
  const dispatch      = useDispatch();
  const bookmarkIds   = useSelector(selectAllBookmarkIds);
  const bookmarkCount = useSelector(selectBookmarkCount); // memoized selector

  // CONCEPT: useMemo to avoid creating a new array on every render
  // bookmarkIds is already from Redux (stable reference if unchanged),
  // but [...bookmarkIds].reverse() would create a new array every render.
  // Memoize it so child components don't get new props needlessly.
  const reversedIds = useMemo(
    () => [...bookmarkIds].reverse(), // show newest bookmarks first
    [bookmarkIds]
  );

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-page__header">
        <h1 className="bookmarks-page__title">
          Bookmarks
          <span className="bookmarks-page__count">({bookmarkCount})</span>
        </h1>

        {bookmarkCount > 0 && (
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              if (window.confirm("Clear all bookmarks?")) {
                dispatch(clearBookmarks());
              }
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {bookmarkCount === 0 ? (
        <div className="empty-state">
          <p>No bookmarks yet.</p>
          <p>
            Browse <Link to="/">posts</Link> and click Bookmark to save them here.
          </p>
        </div>
      ) : (
        <div className="bookmarks-list">
          {reversedIds.map((id) => (
            <BookmarkedPost key={id} postId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
