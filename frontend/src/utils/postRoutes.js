export function getPostPath(post) {
  if (!post) return "/";
  return post.slug ? `/p/${post.slug}` : `/posts/${post.id}`;
}

export function getTagList(post) {
  return (post?.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
