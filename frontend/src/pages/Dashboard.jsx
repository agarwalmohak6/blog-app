import { useState } from "react";
import { Link } from "react-router-dom";
import { useDeletePostMutation, useGetMyPostsQuery } from "../features/posts/postsApi";
import { useDocumentMeta } from "../hooks";
import { getPostPath } from "../utils/postRoutes";

export default function Dashboard() {
  const [status, setStatus] = useState("all");
  const { data, isLoading, error } = useGetMyPostsQuery({ status });
  const [deletePost, { isLoading: deleting }] = useDeletePostMutation();

  useDocumentMeta("Dashboard", "Manage drafts and published posts.");

  return (
    <section className="dashboard-page">
      <div className="dashboard-page__header">
        <div>
          <span className="new-post-page__eyebrow">Publishing</span>
          <h1 className="bookmarks-page__title">Your dashboard</h1>
          <p className="new-post-page__subtitle">Drafts, published stories, and quick actions all in one place.</p>
        </div>
        <Link to="/new-post" className="btn btn--primary">New post</Link>
      </div>

      <div className="dashboard-page__filters">
        {["all", "published", "draft"].map((value) => (
          <button
            key={value}
            type="button"
            className={`category-pill ${status === value ? "active" : ""}`}
            onClick={() => setStatus(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {isLoading && <div className="loading">Loading your posts...</div>}
      {error && <div className="error">Could not load your dashboard.</div>}

      <div className="dashboard-list">
        {data?.posts?.map((post) => (
          <article key={post.id} className="dashboard-card">
            <div className="dashboard-card__content">
              <span className="dashboard-card__status">{post.is_published ? "Published" : "Draft"}</span>
              <h2 className="dashboard-card__title">
                <Link to={getPostPath(post)}>{post.title}</Link>
              </h2>
              <p className="dashboard-card__excerpt">{post.excerpt || "No excerpt yet."}</p>
              <div className="dashboard-card__meta">
                <span>{post.view_count} views</span>
                <span>{post.category || "Uncategorized"}</span>
                <span>{post.slug || "No slug yet"}</span>
              </div>
            </div>
            <div className="dashboard-card__actions">
              <Link to={`/edit-post/${post.id}`} className="btn btn--ghost btn--small">Edit</Link>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={deleting}
                onClick={async () => {
                  if (!window.confirm(`Delete "${post.title}"?`)) return;
                  await deletePost(post.id).unwrap();
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {!isLoading && !data?.posts?.length && (
        <div className="empty-state">
          <p>No posts in this view yet.</p>
          <p><Link to="/new-post">Write your first post</Link> to get your dashboard moving.</p>
        </div>
      )}
    </section>
  );
}
