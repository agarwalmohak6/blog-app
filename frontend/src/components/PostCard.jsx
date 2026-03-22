// =============================================================================
// components/PostCard.jsx — Blog Post Preview Card
// =============================================================================
// Demonstrates:
//   ✅ React.memo — prevent unnecessary re-renders
//   ✅ useDispatch / useSelector — Redux in a child component
//   ✅ useCallback — stable event handler reference
//   ✅ Zustand — addRecentPost on click
// =============================================================================

import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleBookmark, selectIsBookmarked } from "../features/bookmarks/bookmarksSlice";
import { useRecentlyViewedStore } from "../store/zustandStore";
import { getPostPath, getTagList } from "../utils/postRoutes";

// =============================================================================
// CONCEPT: React.memo (Higher-Order Component)
// Wraps a component so it only re-renders if its PROPS change.
// Without memo: every time the parent (Home) re-renders, ALL PostCards re-render
// even if their individual post data hasn't changed.
// With memo: PostCard only re-renders if its `post` or `isRecentlyViewed` prop changes.
//
// memo does a SHALLOW comparison of props.
// If you pass objects/arrays that are recreated each render, memo won't help!
// That's why we memoize data in the parent with useMemo before passing it down.
//
// Docs: https://react.dev/reference/react/memo
// =============================================================================
const PostCard = memo(function PostCard({ post, isRecentlyViewed }) {
  const dispatch      = useDispatch();
  const navigate      = useNavigate();
  const isBookmarked  = useSelector(selectIsBookmarked(post.id));

  // Zustand action — no dispatch needed, just call directly
  const addRecentPost = useRecentlyViewedStore((s) => s.addRecentPost);
  const postPath = getPostPath(post);
  const tags = getTagList(post);

  // ==========================================================================
  // CONCEPT: useCallback
  // Memoizes a function so it has the same reference across renders.
  // Without useCallback: a new handleBookmark function is created every render,
  // breaking memo's shallow comparison for child components that receive it as prop.
  //
  // Rule: use useCallback when:
  //   1. Passing a function as a prop to a memo'd child
  //   2. Using a function in a useEffect/useMemo dependency array
  //
  // Docs: https://react.dev/reference/react/useCallback
  // ==========================================================================
  const handleBookmark = useCallback(
    (e) => {
      e.preventDefault();  // don't navigate to post when clicking bookmark
      e.stopPropagation(); // stop event bubbling to parent Link
      dispatch(toggleBookmark(post.id));
    },
    [dispatch, post.id]    // only recreate if dispatch or post.id changes
  );

  const handleCardClick = useCallback(() => {
    addRecentPost(post.id); // track in Zustand
    navigate(postPath);
  }, [post.id, addRecentPost, navigate, postPath]);

  // ==========================================================================
  // CONCEPT: Event Delegation
  // Instead of attaching onClick to every list item, you can attach ONE handler
  // to the parent and check event.target to know which item was clicked.
  // React uses event delegation internally — all events bubble up to the root.
  //
  // Here we show the alternative: a clickable div with keyboard support.
  // For full accessibility, use <Link> or <button> for clickable elements.
  // Docs: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Event_bubbling
  // ==========================================================================

  // Format date for display
  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString("en-US", {
        year:  "numeric",
        month: "short",
        day:   "numeric",
      })
    : "";

  // Excerpt: first 150 characters of body
  const excerpt = post.body?.length > 150
    ? `${post.body.substring(0, 150)}...`
    : post.body;

  return (
    <article
      className={`post-card ${isRecentlyViewed ? "post-card--recent" : ""} ${isBookmarked ? "post-card--bookmarked" : ""}`}
      // CONCEPT: Implicit ARIA — <article> has semantic meaning for screen readers
      // No need for role="article" — the HTML element provides it natively
    >
      <div
        className="post-card__clickable"
        onClick={handleCardClick}
        // CONCEPT: Make div keyboard accessible (since it's clickable)
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        aria-label={`Read post: ${post.title}`}
      >
        {post.cover_image_url && (
          <div className="post-card__cover-wrap">
            <img src={post.cover_image_url} alt="" className="post-card__cover" loading="lazy" />
          </div>
        )}

        {/* Category badge */}
        {post.category && (
          <span className="post-card__category">{post.category}</span>
        )}

        {/* Recently viewed indicator */}
        {isRecentlyViewed && (
          <span className="post-card__recent-badge" aria-label="Recently viewed">
            👁 Viewed
          </span>
        )}

        {/* Title */}
        <h2 className="post-card__title">{post.title}</h2>

        {/* Excerpt */}
        <p className="post-card__excerpt">{post.excerpt || excerpt}</p>

        {/* Meta */}
        <div className="post-card__meta">
          {post.author && (
            <span className="post-card__author">
              {post.author.username}
            </span>
          )}
          {formattedDate && (
            <time className="post-card__date" dateTime={post.created_at}>
              {formattedDate}
            </time>
          )}
          {post.view_count > 0 && (
            <span className="post-card__views">
              {post.view_count} views
            </span>
          )}
        </div>

        {!!tags.length && (
          <div className="post-card__tags">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Bookmark button — separate from the card click area */}
      <button
        className={`post-card__bookmark ${isBookmarked ? "active" : ""}`}
        onClick={handleBookmark}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this post"}
        aria-pressed={isBookmarked}
        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
      >
        {isBookmarked ? "🔖" : "🏷"}
      </button>
    </article>
  );
});

export default PostCard;
