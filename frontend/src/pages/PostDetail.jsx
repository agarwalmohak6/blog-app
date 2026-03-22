// =============================================================================
// pages/PostDetail.jsx — Single Post View
// =============================================================================
// This page demonstrates:
//   ✅ useOptimistic — show comment instantly before server confirms
//   ✅ useParams — reading URL parameters (React Router v6)
//   ✅ useLoaderData — data loaded before component renders (React Router v6)
//   ✅ Zustand — track recently viewed
//   ✅ RTK Query mutation — createComment
//   ✅ useRef — focus textarea after submit
//   ✅ useId — accessible form IDs
// =============================================================================

import {
  useState,
  useOptimistic,
  useRef,
  useId,
  useTransition,
  useEffect,
} from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  useGetPostQuery,
  useGetPostBySlugQuery,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeletePostMutation,
} from "../features/posts/postsApi";
import {
  toggleBookmark,
  selectIsBookmarked,
} from "../features/bookmarks/bookmarksSlice";
import { selectIsLoggedIn, selectCurrentUser } from "../features/auth/authSlice";
import { useRecentlyViewedStore } from "../store/zustandStore";
import { CommentSection } from "../components";
import { useDocumentMeta } from "../hooks";
import { getTagList } from "../utils/postRoutes";

export default function PostDetail() {
  // ==========================================================================
  // ROUTER
  // ==========================================================================
  // CONCEPT: useParams — extracts dynamic segments from the URL
  // Route defined as: /posts/:postId → useParams gives { postId: "42" }
  // Note: params are always STRINGS — convert to number for API calls
  // Docs: https://reactrouter.com/en/main/hooks/use-params
  // ==========================================================================
  const { postId, slug } = useParams();
  const navigate = useNavigate();

  // ==========================================================================
  // RTK QUERY
  // ==========================================================================
  const postQuery = useGetPostQuery(postId, { skip: !postId });
  const slugQuery = useGetPostBySlugQuery(slug, { skip: !slug });
  const post = slug ? slugQuery.data : postQuery.data;
  const currentPostId = post?.id ?? (postId ? Number(postId) : undefined);
  const postLoading = slug ? slugQuery.isLoading : postQuery.isLoading;
  const postError = slug ? slugQuery.error : postQuery.error;
  const { data: comments, isLoading: commentsLoading } = useGetCommentsQuery(currentPostId, {
    skip: !currentPostId,
  });
  const [createComment, { isLoading: submitting }] = useCreateCommentMutation();
  const [deletePost, { isLoading: deletingPost }] = useDeletePostMutation();

  // ==========================================================================
  // REDUX
  // ==========================================================================
  const dispatch      = useDispatch();
  const isBookmarked  = useSelector(selectIsBookmarked(currentPostId ?? Number(postId)));
  const isLoggedIn    = useSelector(selectIsLoggedIn);
  const currentUser   = useSelector(selectCurrentUser);
  const isOwner = !!post && !!currentUser && post.author_id === currentUser.id;

  // ==========================================================================
  // ZUSTAND — track recently viewed posts
  // ==========================================================================
  const addRecentPost = useRecentlyViewedStore((s) => s.addRecentPost);

  // Track view on mount
  useEffect(() => {
    if (currentPostId) addRecentPost(Number(currentPostId));
  }, [currentPostId, addRecentPost]);

  useDocumentMeta(
    post ? `${post.seo_title || post.title} | The Blog` : "Post",
    post?.seo_description || post?.excerpt || ""
  );

  // ==========================================================================
  // LOCAL STATE
  // ==========================================================================
  const [commentText, setCommentText] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const textareaRef                   = useRef(null);
  const commentFormId                 = useId();
  const [isPending, startTransition]  = useTransition();

  // ==========================================================================
  // useOptimistic — Show comment immediately before server confirms
  // ==========================================================================
  // CONCEPT: useOptimistic
  //   Optimistic UI = update the UI INSTANTLY, assume success, roll back if error.
  //   This makes the app feel instant — no waiting for the network.
  //
  //   useOptimistic(currentState, updateFn) returns:
  //     optimisticComments → the list with the optimistic item added
  //     addOptimisticComment → function to add an optimistic item
  //
  //   When the real mutation settles:
  //     ✅ Success → optimistic item is replaced by real server data
  //     ❌ Error   → optimistic item is removed (rolled back automatically)
  //
  //   Docs: https://react.dev/reference/react/useOptimistic
  // ==========================================================================
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments ?? [],

    // updateFn: how to merge the optimistic item into existing state
    // (currentComments, newOptimisticItem) => mergedList
    (currentComments, optimisticComment) => [
      ...currentComments,
      optimisticComment,
    ]
  );

  // ==========================================================================
  // SUBMIT COMMENT
  // ==========================================================================
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitError(null);

    // Create an optimistic comment object that LOOKS like a real comment
    // CONCEPT: Date.now() gives a temporary unique ID (negative to avoid clash with real IDs)
    const optimisticComment = {
      id:         -Date.now(),       // temporary negative ID
      body:       commentText.trim(),
      post_id:    Number(currentPostId),
      author_id:  currentUser?.id,
      created_at: new Date().toISOString(),
      author: {
        id:       currentUser?.id,
        username: currentUser?.username ?? "You",
      },
      _isOptimistic: true,           // flag to style differently (e.g., faded)
    };

    // CONCEPT: startTransition + addOptimisticComment
    // We wrap in startTransition so React knows this is a deferred update.
    // addOptimisticComment immediately adds the fake comment to the UI.
    startTransition(async () => {
      addOptimisticComment(optimisticComment);
      setCommentText(""); // clear input immediately

      try {
        await createComment({
          postId: Number(currentPostId),
          body: optimisticComment.body,
        }).unwrap(); // .unwrap() throws if the mutation fails (vs returning error)

        // Focus textarea after successful submit (UX: ready for next comment)
        textareaRef.current?.focus();
      } catch (err) {
        // Optimistic comment is automatically rolled back by useOptimistic
        setCommentText(optimisticComment.body); // restore the text they typed
        setSubmitError(err?.data?.detail ?? "Failed to post comment. Try again.");
      }
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (postLoading) return <div className="loading">Loading post...</div>;
  if (postError)   return (
    <div className="error">
      Post not found. <Link to="/">← Back to posts</Link>
    </div>
  );
  if (!post) return null;
  const tags = getTagList(post);
  const publishDate = post.published_at || post.created_at;

  return (
    <article className="post-detail">

      {/* Back navigation */}
      <Link to="/" className="post-detail__back">← All Posts</Link>

      {/* Post Header */}
      <header className="post-detail__header">
        {post.category && (
          <span className="post-detail__category">{post.category}</span>
        )}

        <h1 className="post-detail__title">{post.title}</h1>

        {post.excerpt && (
          <p className="post-detail__lede">{post.excerpt}</p>
        )}

        <div className="post-detail__meta">
          {post.author && (
            <Link to={`/authors/${post.author.username}`} className="post-detail__author">
              by <strong>{post.author.username}</strong>
            </Link>
          )}
          <time
            className="post-detail__date"
            dateTime={publishDate}
          >
            {publishDate?.slice(0, 10)}
          </time>
          <span className="post-detail__views">👁 {post.view_count} views</span>
          {!post.is_published && <span className="dashboard-card__status">Draft</span>}
        </div>

        <div className="post-detail__actions">
          <button
            className={`bookmark-btn ${isBookmarked ? "active" : ""}`}
            onClick={() => dispatch(toggleBookmark(Number(currentPostId)))}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? "🔖 Bookmarked" : "🏷 Bookmark"}
          </button>

          {isOwner && (
            <>
              <Link to={`/edit-post/${post.id}`} className="btn btn--ghost btn--small">
                Edit
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={deletingPost}
                onClick={async () => {
                  if (!window.confirm(`Delete "${post.title}"?`)) return;
                  await deletePost(post.id).unwrap();
                  navigate("/dashboard");
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {post.cover_image_url && (
        <img src={post.cover_image_url} alt="" className="post-detail__cover" />
      )}

      {/* Post Body */}
      <div className="post-detail__body">
        {post.body}
      </div>

      {/* Tags */}
      {!!tags.length && (
        <div className="post-detail__tags">
          {tags.map((tag) => (
            <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`} className="tag">
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* ===================================================================
          COMMENTS SECTION
      =================================================================== */}
      <section className="comments" aria-label="Comments">
        <h2 className="comments__title">
          Comments ({optimisticComments.length})
        </h2>

        {/* Comment Form — only for logged in users */}
        {isLoggedIn ? (
          <form
            onSubmit={handleCommentSubmit}
            className="comment-form"
            aria-label="Add a comment"
          >
            <label htmlFor={commentFormId} className="comment-form__label">
              Leave a comment
            </label>
            <textarea
              id={commentFormId}
              ref={textareaRef}
              className="comment-form__input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              maxLength={2000}
              disabled={submitting || isPending}
              aria-describedby={submitError ? `${commentFormId}-error` : undefined}
            />

            {submitError && (
              <p
                id={`${commentFormId}-error`}
                className="comment-form__error"
                role="alert"
              >
                {submitError}
              </p>
            )}

            <div className="comment-form__footer">
              <span className="comment-form__count">
                {commentText.length}/2000
              </span>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!commentText.trim() || submitting || isPending}
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        ) : (
          <p className="comments__login-prompt">
            <Link to="/login">Log in</Link> to leave a comment.
          </p>
        )}

        {/* Comment List — passes optimistic comments (may include unconfirmed ones) */}
        <CommentSection
          comments={optimisticComments}
          isLoading={commentsLoading}
        />
      </section>
    </article>
  );
}
