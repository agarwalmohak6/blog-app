import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import PostEditorForm from "../components/PostEditorForm";
import { useDocumentMeta } from "../hooks";
import { useGetPostQuery, useUpdatePostMutation } from "../features/posts/postsApi";
import { selectCurrentUser } from "../features/auth/authSlice";

export default function EditPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const { data: post, isLoading, error } = useGetPostQuery(postId);
  const [updatePost, { isLoading: isSaving, error: saveError }] = useUpdatePostMutation();

  useDocumentMeta(post ? `Edit ${post.title}` : "Edit Post", "Update your post, SEO fields, and publishing state.");

  if (isLoading) return <div className="loading">Loading editor...</div>;
  if (error || !post) return <div className="error">Post not found.</div>;
  if (currentUser && post.author_id !== currentUser.id) return <Navigate to="/" replace />;

  return (
    <div>
      <Link to="/dashboard" className="post-detail__back">← Back to dashboard</Link>
      <PostEditorForm
        initialValues={post}
        heading="Edit post"
        intro="Refine the article, update metadata, or move it between draft and published."
        submitLabel="Save changes"
        isSubmitting={isSaving}
        error={saveError?.data?.detail}
        onSubmit={async (values) => {
          const updated = await updatePost({ id: post.id, ...values }).unwrap();
          navigate(updated.slug ? `/p/${updated.slug}` : `/posts/${updated.id}`);
        }}
      />
    </div>
  );
}
