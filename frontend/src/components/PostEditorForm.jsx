import { useEffect, useId, useState } from "react";

const CATEGORY_OPTIONS = ["Technology", "Science", "Health", "Business", "Culture", "Other"];

const defaultValues = {
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  category: "",
  tags: "",
  seo_title: "",
  seo_description: "",
  body: "",
  is_published: true,
};

export default function PostEditorForm({
  initialValues = defaultValues,
  heading,
  intro,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
}) {
  const [formData, setFormData] = useState({ ...defaultValues, ...initialValues });

  useEffect(() => {
    setFormData({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const titleId = useId();
  const slugId = useId();
  const excerptId = useId();
  const coverId = useId();
  const categoryId = useId();
  const tagsId = useId();
  const seoTitleId = useId();
  const seoDescriptionId = useId();
  const bodyId = useId();
  const publishId = useId();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  const wordCount = formData.body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="editor-page">
      <div className="new-post-page__header">
        <span className="new-post-page__eyebrow">Writer Studio</span>
        <h1 className="new-post-page__title">{heading}</h1>
        <p className="new-post-page__subtitle">{intro}</p>
      </div>

      <form className="new-post-form" onSubmit={handleSubmit} noValidate>
        <div className="new-post-form__grid">
          <div className="form-group new-post-form__group new-post-form__group--wide">
            <label htmlFor={titleId}>Title</label>
            <input
              id={titleId}
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="A headline people will want to open"
              minLength={5}
              maxLength={300}
              required
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={slugId}>Slug</label>
            <input
              id={slugId}
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              placeholder="leave blank to auto-generate"
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={categoryId}>Category</label>
            <select
              id={categoryId}
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Choose a category</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group new-post-form__group new-post-form__group--wide">
            <label htmlFor={excerptId}>Excerpt</label>
            <textarea
              id={excerptId}
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A short preview for cards, feeds, and SEO"
              rows={3}
              maxLength={240}
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={coverId}>Cover image URL</label>
            <input
              id={coverId}
              name="cover_image_url"
              type="url"
              value={formData.cover_image_url}
              onChange={handleChange}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={tagsId}>Tags</label>
            <input
              id={tagsId}
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleChange}
              placeholder="react, fastapi, tutorial"
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={seoTitleId}>SEO title</label>
            <input
              id={seoTitleId}
              name="seo_title"
              type="text"
              value={formData.seo_title}
              onChange={handleChange}
              placeholder="Optional override for browser title"
              maxLength={300}
            />
          </div>

          <div className="form-group new-post-form__group">
            <label htmlFor={seoDescriptionId}>SEO description</label>
            <textarea
              id={seoDescriptionId}
              name="seo_description"
              value={formData.seo_description}
              onChange={handleChange}
              placeholder="Optional summary for search engines"
              rows={3}
              maxLength={320}
            />
          </div>
        </div>

        <div className="form-group new-post-form__group">
          <label htmlFor={bodyId}>Post body</label>
          <textarea
            id={bodyId}
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder="Write your story here..."
            rows={14}
            minLength={10}
            required
          />
          <div className="new-post-form__meta">
            <span>{wordCount} words</span>
            <span>{formData.body.length} characters</span>
          </div>
        </div>

        <label htmlFor={publishId} className="new-post-form__publish">
          <input
            id={publishId}
            name="is_published"
            type="checkbox"
            checked={formData.is_published}
            onChange={handleChange}
          />
          <span>
            Publish immediately
            <small>Turn this off to keep the post as a draft in your dashboard.</small>
          </span>
        </label>

        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="new-post-form__actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
