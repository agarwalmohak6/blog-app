import { useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { useGetPostsQuery } from "../features/posts/postsApi";
import { useDocumentMeta } from "../hooks";

export default function TagPosts() {
  const { tag } = useParams();
  const { data, isLoading, error } = useGetPostsQuery({ tag, limit: 20 });

  useDocumentMeta(`#${tag} posts`, `Browse posts tagged with ${tag}.`);

  if (isLoading) return <div className="loading">Loading tagged posts...</div>;
  if (error) return <div className="error">Could not load tagged posts.</div>;

  return (
    <section className="tag-page">
      <span className="new-post-page__eyebrow">Tag archive</span>
      <h1 className="bookmarks-page__title">#{tag}</h1>
      <p className="new-post-page__subtitle">{data?.total || 0} posts found.</p>
      <div className="home__posts">
        {data?.posts?.map((post) => (
          <PostCard key={post.id} post={post} isRecentlyViewed={false} />
        ))}
      </div>
    </section>
  );
}
