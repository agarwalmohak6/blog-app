# =============================================================================
# routers/posts.py — Blog Posts CRUD Endpoints
# =============================================================================
# CONCEPT: REST API Design
#   REST (Representational State Transfer) organizes endpoints around resources.
#   For "posts" resource:
#     GET    /posts       → list all posts (with pagination/search)
#     POST   /posts       → create a new post
#     GET    /posts/{id}  → get one post
#     PATCH  /posts/{id}  → partially update a post
#     DELETE /posts/{id}  → delete a post
#
#   HTTP methods convey intent — GET is read-only, POST creates, etc.
#   Docs: https://restfulapi.net/
# =============================================================================

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, extract
from sqlalchemy.orm import selectinload
from typing import Optional
from database import get_db, AsyncSessionLocal
import models, schemas
from auth import get_current_user, get_current_user_optional
from content_utils import ensure_unique_slug, normalize_post_payload
from tasks import increment_post_view_count

router = APIRouter(tags=["Posts"])


# =============================================================================
# GET /posts — List posts with search, filter, pagination
# =============================================================================
@router.get("/", response_model=schemas.PostListResponse)
async def list_posts(
    # CONCEPT: Query Parameters
    # These come from the URL: GET /posts?page=2&limit=10&search=python
    # FastAPI maps them to function parameters automatically with type validation.
    page:     int            = Query(1, ge=1, description="Page number (starts at 1)"),
    limit:    int            = Query(10, ge=1, le=100, description="Posts per page"),
    search:   Optional[str] = Query(None, description="Search in title and body"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tag:      Optional[str] = Query(None, description="Filter by tag"),
    author:   Optional[str] = Query(None, description="Filter by author username"),
    status_filter: str = Query("published", alias="status", pattern="^(published|draft|all)$"),
    db:       AsyncSession  = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """
    List published posts with optional search and category filter.

    CONCEPT: Pagination
    Loading all posts at once is expensive and slow for the client.
    Pagination loads data in chunks:
      - page=1, limit=10 → rows 1-10
      - page=2, limit=10 → rows 11-20  (OFFSET = (page-1) * limit)
    """
    # Start building the query — we add filters conditionally
    # CONCEPT: SQLAlchemy Query Builder — chain methods to build SQL
    query = (
        select(models.Post)
        .options(selectinload(models.Post.author))
        .order_by(models.Post.published_at.desc().nullslast(), models.Post.created_at.desc())
    )

    if status_filter == "published":
        query = query.where(models.Post.is_published == True)
    elif status_filter == "draft":
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required to view drafts")
        query = query.where(
            models.Post.author_id == current_user.id,
            models.Post.is_published == False,
        )
    elif status_filter == "all":
        if current_user and author == current_user.username:
            query = query.where(models.Post.author_id == current_user.id)
        else:
            query = query.where(models.Post.is_published == True)

    if search:
        # OR search across title and body — case-insensitive with ilike
        query = query.where(
            or_(
                models.Post.title.ilike(f"%{search}%"),
                models.Post.body.ilike(f"%{search}%"),
                models.Post.excerpt.ilike(f"%{search}%"),
                models.Post.tags.ilike(f"%{search}%"),
            )
        )

    if category:
        query = query.where(models.Post.category == category)

    if tag:
        query = query.where(models.Post.tags.ilike(f"%{tag}%"))

    if author:
        query = query.join(models.User).where(models.User.username == author.lower())
        if not current_user or current_user.username != author.lower() or status_filter == "published":
            query = query.where(models.Post.is_published == True)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    posts = result.scalars().all()

    return schemas.PostListResponse(
        posts=list(posts),  # type: ignore
        total=total or 0,
        page=page,
        limit=limit,
        has_more=(offset + len(posts)) < (total or 0),  # are there more pages?
    )


# =============================================================================
# GET /posts/dashboard/me — Authenticated author dashboard list
# =============================================================================
@router.get("/dashboard/me", response_model=schemas.PostListResponse)
async def get_my_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query("all", alias="status", pattern="^(published|draft|all)$"),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return await list_posts(
        page=page,
        limit=limit,
        search=None,
        category=None,
        tag=None,
        author=current_user.username,
        status_filter=status_filter,
        db=db,
        current_user=current_user,
    )


@router.get("/authors/{username}", response_model=schemas.AuthorProfileResponse)
async def get_author_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.User)
        .where(models.User.username == username.lower())
        .options(selectinload(models.User.posts))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Author not found")

    published_posts = [post for post in user.posts if post.is_published]
    recent_posts = sorted(
        published_posts,
        key=lambda post: post.published_at or post.created_at or datetime.min,
        reverse=True,
    )[:5]

    return schemas.AuthorProfileResponse(
        user=user,
        posts_count=len(published_posts),
        total_views=sum(post.view_count or 0 for post in published_posts),
        recent_posts=recent_posts,
    )


@router.get("/archives/summary", response_model=list[schemas.ArchiveSummary])
async def get_archive_summary(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            extract("year", func.coalesce(models.Post.published_at, models.Post.created_at)).label("year"),
            extract("month", func.coalesce(models.Post.published_at, models.Post.created_at)).label("month"),
            func.count(models.Post.id).label("count"),
        )
        .where(models.Post.is_published == True)
        .group_by("year", "month")
        .order_by(extract("year", func.coalesce(models.Post.published_at, models.Post.created_at)).desc(),
                  extract("month", func.coalesce(models.Post.published_at, models.Post.created_at)).desc())
    )
    rows = result.all()
    return [
        schemas.ArchiveSummary(
            year=int(row.year),
            month=int(row.month),
            label=datetime(int(row.year), int(row.month), 1).strftime("%B %Y"),
            count=row.count,
        )
        for row in rows
    ]


@router.get("/tags/summary", response_model=list[schemas.TagSummary])
async def get_tags_summary(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Post.tags).where(
            models.Post.is_published == True,
            models.Post.tags.is_not(None),
        )
    )
    counts: dict[str, int] = {}
    for tags_value in result.scalars():
        for tag in [tag.strip() for tag in tags_value.split(",") if tag.strip()]:
            counts[tag] = counts.get(tag, 0) + 1

    return [
        schemas.TagSummary(tag=tag, count=count)
        for tag, count in sorted(counts.items(), key=lambda item: (-item[1], item[0].lower()))
    ]


@router.get("/feed.xml")
async def get_rss_feed(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Post)
        .where(models.Post.is_published == True)
        .options(selectinload(models.Post.author))
        .order_by(models.Post.published_at.desc().nullslast(), models.Post.created_at.desc())
        .limit(20)
    )
    posts = result.scalars().all()

    items = []
    for post in posts:
        pub_date = post.published_at or post.created_at
        items.append(
            f"""
            <item>
              <title><![CDATA[{post.title}]]></title>
              <link>http://localhost:5173/{'p/' + post.slug if post.slug else f'posts/{post.id}'}</link>
              <guid>{post.slug or post.id}</guid>
              <description><![CDATA[{post.excerpt or ''}]]></description>
              <author>{post.author.email if post.author else 'noreply@example.com'}</author>
              <pubDate>{pub_date.strftime('%a, %d %b %Y %H:%M:%S GMT') if pub_date else ''}</pubDate>
            </item>
            """
        )

    xml = f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>The Blog</title>
    <link>http://localhost:5173</link>
    <description>A modern publishing blog</description>
    {''.join(items)}
  </channel>
</rss>"""
    return Response(content=xml, media_type="application/rss+xml")


@router.get("/slug/{slug}", response_model=schemas.PostResponse)
async def get_post_by_slug(
    slug: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    result = await db.execute(
        select(models.Post)
        .where(models.Post.slug == slug)
        .options(
            selectinload(models.Post.author),
            selectinload(models.Post.comments).selectinload(models.Comment.author),
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not post.is_published and (not current_user or current_user.id != post.author_id):
        raise HTTPException(status_code=404, detail="Post not found")

    background_tasks.add_task(increment_post_view_count, post.id, AsyncSessionLocal)
    return post


# =============================================================================
# GET /posts/{post_id} — Get a single post
# =============================================================================
@router.get("/{post_id}", response_model=schemas.PostResponse)
async def get_post(
    post_id: int,                          # path parameter — from /posts/42
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    # Optional auth — logged-in users could get draft posts in the future
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    result = await db.execute(
        select(models.Post)
        .where(models.Post.id == post_id)
        .options(
            selectinload(models.Post.author),
            selectinload(models.Post.comments).selectinload(models.Comment.author),
        )
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if not post.is_published and (not current_user or current_user.id != post.author_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Queue view count increment as background task
    # CONCEPT: We pass the session factory, not the session itself
    # because background tasks run after the request session is closed
    background_tasks.add_task(
        increment_post_view_count, post_id, AsyncSessionLocal
    )

    return post


# =============================================================================
# POST /posts — Create a new post (protected)
# =============================================================================
@router.post("/", response_model=schemas.PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: schemas.PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),  # auth required
):
    """
    Create a new blog post. Requires authentication.

    CONCEPT: current_user comes from the JWT token — we don't need the client
    to send user_id in the body. We extract it from the verified token.
    This prevents users from creating posts on behalf of others.
    """
    payload = normalize_post_payload(post_data.model_dump())
    payload["slug"] = await ensure_unique_slug(
        db,
        payload["title"],
        payload.get("slug"),
    )

    new_post = models.Post(**payload, author_id=current_user.id)
    db.add(new_post)
    await db.flush()
    await db.refresh(new_post)

    # Reload with relationships for the response
    result = await db.execute(
        select(models.Post)
        .where(models.Post.id == new_post.id)
        .options(selectinload(models.Post.author))
    )
    return result.scalar_one()


# =============================================================================
# PATCH /posts/{post_id} — Partial update (protected, owner only)
# =============================================================================
@router.patch("/{post_id}", response_model=schemas.PostResponse)
async def update_post(
    post_id: int,
    updates: schemas.PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    CONCEPT: PATCH vs PUT
    PUT replaces the entire resource (all fields required).
    PATCH partially updates it (only provided fields change).
    We use PATCH here — client only sends what changed.
    """
    result = await db.execute(
        select(models.Post).where(models.Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Authorization check — only the author can edit their post
    if post.author_id != current_user.id:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this post"
        )

    # CONCEPT: model_dump(exclude_unset=True)
    # Only includes fields the client actually sent — ignores fields with default None
    # Prevents accidentally overwriting data with None
    update_data = normalize_post_payload(
        updates.model_dump(exclude_unset=True),
        existing_post=post,
    )
    if "slug" in update_data or "title" in update_data:
        update_data["slug"] = await ensure_unique_slug(
            db,
            update_data.get("title") or post.title,
            update_data.get("slug") or post.slug,
            exclude_post_id=post.id,
        )
    for field, value in update_data.items():
        setattr(post, field, value)  # dynamically update ORM object attributes

    await db.flush()
    result = await db.execute(
        select(models.Post)
        .where(models.Post.id == post.id)
        .options(selectinload(models.Post.author))
    )
    return result.scalar_one()


# =============================================================================
# DELETE /posts/{post_id} — Delete a post (protected, owner only)
# =============================================================================
@router.delete("/{post_id}", response_model=schemas.MessageResponse)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Post).where(models.Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id:  # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    await db.delete(post)
    # Comments are deleted automatically via cascade="all, delete-orphan" in the model

    return schemas.MessageResponse(message=f"Post {post_id} deleted successfully")
