// =============================================================================
// pages/NewPost.jsx — Create Post Page
// =============================================================================
// Demonstrates:
//   ✅ Controlled form state
//   ✅ RTK Query mutation — createPost
//   ✅ useId for accessible labels
//   ✅ useTransition for non-urgent navigation after submit
// =============================================================================

import { Link, useNavigate } from "react-router-dom";
import PostEditorForm from "../components/PostEditorForm";
import { useCreatePostMutation } from "../features/posts/postsApi";
import { useDocumentMeta } from "../hooks";

export default function NewPost() {
  const navigate = useNavigate();
  const [createPost, { isLoading }] = useCreatePostMutation();
  useDocumentMeta("Create Post", "Write a new post with SEO, cover image, and draft support.");

  return (
    <div>
      <Link to="/" className="post-detail__back">← Back to posts</Link>
      <PostEditorForm
        heading="Create a new post"
        intro="Draft something thoughtful, add metadata, and decide whether it should go live now or stay in draft."
        submitLabel="Create post"
        isSubmitting={isLoading}
        onSubmit={async (values) => {
          const createdPost = await createPost(values).unwrap();
          navigate(createdPost.slug ? `/p/${createdPost.slug}` : `/posts/${createdPost.id}`);
        }}
      />
    </div>
  );
}
