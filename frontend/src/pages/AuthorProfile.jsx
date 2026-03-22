import { Link, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { useDocumentMeta } from "../hooks";
import { useGetAuthorProfileQuery, useGetPostsQuery } from "../features/posts/postsApi";

export default function AuthorProfile() {
  const { username } = useParams();
  const { data: profile, isLoading, error } = useGetAuthorProfileQuery(username);
  const { data: postsData, isLoading: postsLoading } = useGetPostsQuery({
    author: username,
    limit: 20,
  });

  useDocumentMeta(
    profile ? `${profile.user.username} on The Blog` : "Author",
    profile?.user?.bio || "Browse author posts and profile information."
  );

  if (isLoading) return <div className="loading">Loading author...</div>;
  if (error || !profile) return <div className="error">Author not found.</div>;

  return (
    <section className="author-page">
      <div className="author-hero">
        <div className="author-hero__avatar">
          {(profile.user.username || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <span className="new-post-page__eyebrow">Author profile</span>
          <h1 className="bookmarks-page__title">@{profile.user.username}</h1>
          <p className="new-post-page__subtitle">{profile.user.bio || "This author has not added a bio yet."}</p>
          <div className="author-hero__stats">
            <span>{profile.posts_count} published posts</span>
            <span>{profile.total_views} total views</span>
            <Link to={`/posts?author=${profile.user.username}`}>Feed API filter</Link>
          </div>
        </div>
      </div>

      {postsLoading ? (
        <div className="loading loading--inline">Loading posts...</div>
      ) : (
        <div className="home__posts">
          {postsData?.posts?.map((post) => (
            <PostCard key={post.id} post={post} isRecentlyViewed={false} />
          ))}
        </div>
      )}
    </section>
  );
}
