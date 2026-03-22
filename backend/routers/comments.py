# =============================================================================
# routers/comments.py — Comments Endpoints
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
import models, schemas
from auth import get_current_user
from tasks import send_new_comment_notification

router = APIRouter(tags=["Comments"])


@router.get("/posts/{post_id}/comments", response_model=list[schemas.CommentResponse])
async def get_comments(
    post_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all comments for a post."""
    result = await db.execute(
        select(models.Comment)
        .where(models.Comment.post_id == post_id)
        .options(selectinload(models.Comment.author))
        .order_by(models.Comment.created_at.asc())
    )
    return result.scalars().all()


@router.post(
    "/posts/{post_id}/comments",
    response_model=schemas.CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: int,
    comment_data: schemas.CommentBase,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a comment on a post.
    Sends a background email notification to the post author.

    CONCEPT: Background Tasks in action
    The comment is saved and the 201 response is returned immediately.
    The email notification runs asynchronously — doesn't slow down the response.
    """
    # Verify post exists and get author info for notification
    post_result = await db.execute(
        select(models.Post)
        .where(models.Post.id == post_id)
        .options(selectinload(models.Post.author))
    )
    post = post_result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Create the comment
    new_comment = models.Comment(
        body=comment_data.body,
        post_id=post_id,
        author_id=current_user.id,
    )
    db.add(new_comment)
    await db.flush()
    await db.refresh(new_comment)

    # Notify post author (unless they're commenting on their own post)
    if post.author_id != current_user.id and post.author:
        background_tasks.add_task(
            send_new_comment_notification,
            post_author_email=post.author.email,
            post_title=post.title,
            commenter_username=str(current_user.username),
            comment_preview=comment_data.body,
        )

    # Reload with author for response
    result = await db.execute(
        select(models.Comment)
        .where(models.Comment.id == new_comment.id)
        .options(selectinload(models.Comment.author))
    )
    return result.scalar_one()


@router.delete("/comments/{comment_id}", response_model=schemas.MessageResponse)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Comment).where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id:  # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    return schemas.MessageResponse(message="Comment deleted")
