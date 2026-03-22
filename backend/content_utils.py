from datetime import datetime, timezone
import re
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import models


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value or "post"


def build_excerpt(body: str, excerpt: Optional[str] = None, max_length: int = 180) -> str:
    cleaned_excerpt = (excerpt or "").strip()
    if cleaned_excerpt:
        return cleaned_excerpt[:max_length]

    normalized_body = re.sub(r"\s+", " ", (body or "")).strip()
    if len(normalized_body) <= max_length:
      return normalized_body
    return normalized_body[: max_length - 1].rstrip() + "…"


async def ensure_unique_slug(
    db: AsyncSession,
    title: str,
    preferred_slug: Optional[str] = None,
    exclude_post_id: Optional[int] = None,
) -> str:
    base_slug = slugify(preferred_slug or title)
    candidate = base_slug
    counter = 2

    while True:
        result = await db.execute(
            select(models.Post.id).where(models.Post.slug == candidate)
        )
        existing_id = result.scalar_one_or_none()
        if existing_id is None or existing_id == exclude_post_id:
            return candidate

        candidate = f"{base_slug}-{counter}"
        counter += 1


def normalize_post_payload(payload: dict, *, existing_post: Optional[models.Post] = None) -> dict:
    normalized = payload.copy()
    current_title = normalized.get("title")
    if current_title is None and existing_post is not None:
        current_title = existing_post.title
    normalized["title"] = (current_title or "").strip()

    current_body = normalized.get("body")
    if current_body is None and existing_post is not None:
        current_body = existing_post.body
    normalized["body"] = (current_body or "").strip()

    category = normalized.get("category")
    normalized["category"] = category.strip() if isinstance(category, str) and category.strip() else None

    tags = normalized.get("tags")
    if isinstance(tags, str):
        cleaned_tags = ",".join(tag.strip() for tag in tags.split(",") if tag.strip())
        normalized["tags"] = cleaned_tags or None

    excerpt = normalized.get("excerpt")
    normalized["excerpt"] = build_excerpt(
        normalized.get("body") or (existing_post.body if existing_post else ""),
        excerpt,
    )

    for field in ("cover_image_url", "seo_title", "seo_description"):
        value = normalized.get(field)
        normalized[field] = value.strip() if isinstance(value, str) and value.strip() else None

    normalized["seo_title"] = normalized.get("seo_title") or normalized["title"]
    normalized["seo_description"] = normalized.get("seo_description") or normalized["excerpt"]

    is_published = normalized.get("is_published")
    if is_published is None and existing_post is not None:
        is_published = existing_post.is_published

    if is_published and (existing_post is None or existing_post.published_at is None):
        normalized["published_at"] = datetime.now(timezone.utc)
    elif is_published is False:
        normalized["published_at"] = None

    return normalized
