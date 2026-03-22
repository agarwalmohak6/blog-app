import { Link } from "react-router-dom";
import { useGetArchiveSummaryQuery, useGetTagsSummaryQuery } from "../features/posts/postsApi";
import { useDocumentMeta } from "../hooks";

export default function Archives() {
  const { data: archiveSummary, isLoading: archiveLoading } = useGetArchiveSummaryQuery();
  const { data: tagsSummary, isLoading: tagsLoading } = useGetTagsSummaryQuery();

  useDocumentMeta("Archives", "Browse monthly archives and popular tags.");

  return (
    <section className="archives-page">
      <div className="dashboard-page__header">
        <div>
          <span className="new-post-page__eyebrow">Discover</span>
          <h1 className="bookmarks-page__title">Archives and tags</h1>
          <p className="new-post-page__subtitle">A blogspot-style browse surface for older posts, labels, and long-tail discovery.</p>
        </div>
      </div>

      <div className="archives-grid">
        <div className="archives-card">
          <h2>Archive timeline</h2>
          {archiveLoading ? (
            <div className="loading loading--inline">Loading archive...</div>
          ) : (
            <ul className="archives-list">
              {archiveSummary?.map((item) => (
                <li key={`${item.year}-${item.month}`}>
                  <span>{item.label}</span>
                  <span>{item.count} posts</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="archives-card">
          <h2>Popular tags</h2>
          {tagsLoading ? (
            <div className="loading loading--inline">Loading tags...</div>
          ) : (
            <div className="archives-tags">
              {tagsSummary?.map((tag) => (
                <Link key={tag.tag} to={`/tags/${encodeURIComponent(tag.tag)}`} className="tag">
                  #{tag.tag} ({tag.count})
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
