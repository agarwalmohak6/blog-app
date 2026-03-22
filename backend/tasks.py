# =============================================================================
# tasks.py — FastAPI Background Tasks
# =============================================================================
# CONCEPT: Background Tasks
#   Some operations shouldn't block the HTTP response:
#   - Sending emails (could take 1-3 seconds)
#   - Updating analytics/counters
#   - Generating thumbnails
#   - Sending notifications
#
#   FastAPI's BackgroundTasks runs these AFTER the response is sent.
#   The client gets an immediate response, and the task runs in the background.
#
#   For production use Celery + Redis for distributed task queues.
#   FastAPI's built-in BackgroundTasks is great for simple use cases.
#   Docs: https://fastapi.tiangolo.com/tutorial/background-tasks/
# =============================================================================

import logging
import asyncio
from datetime import datetime

# Configure logging — in production, use structured logging (structlog, loguru)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# EMAIL SIMULATION
# =============================================================================
# CONCEPT: In production, you'd use:
#   - SMTP: smtplib or aiosmtplib (async)
#   - Services: SendGrid, Mailgun, AWS SES
#   - Libraries: fastapi-mail
#
# We simulate with asyncio.sleep + logging to show the pattern without
# requiring real email credentials.
# =============================================================================

async def send_new_comment_notification(
    post_author_email: str,
    post_title: str,
    commenter_username: str,
    comment_preview: str,
) -> None:
    """
    Simulates sending an email notification to the post author
    when someone comments on their post.

    This runs IN THE BACKGROUND after the HTTP response is sent.
    The user who posted the comment gets a 201 response immediately,
    and this function runs after.
    """
    logger.info(f"[BACKGROUND TASK] Preparing comment notification email...")

    # Simulate network latency of sending an email (1-2 seconds normally)
    await asyncio.sleep(1)

    # In production, this would be: await email_client.send(...)
    comment_preview_short = comment_preview[:100]
    email_body = f"""
    ===============================
    📬 NEW COMMENT NOTIFICATION
    ===============================
    To:      {post_author_email}
    Subject: New comment on "{post_title}"
    
    {commenter_username} commented on your post:
    "{comment_preview_short}..."
    
    Sent at: {datetime.now().isoformat()}
    ===============================
    """
    logger.info(email_body)
    logger.info(f"[BACKGROUND TASK] ✅ Email sent to {post_author_email}")


async def send_welcome_email(email: str, username: str) -> None:
    """
    Simulates sending a welcome email after user registration.
    """
    await asyncio.sleep(0.5)  # simulate email send
    logger.info(f"[BACKGROUND TASK] ✅ Welcome email sent to {email} for user @{username}")


async def increment_post_view_count(post_id: int, db_session_factory) -> None:
    """
    Increments view count in the background — doesn't block the response.

    CONCEPT: Fire-and-forget pattern
    The user gets the post data immediately. The view count update
    happens asynchronously, so a slow DB write doesn't delay the response.
    """
    from sqlalchemy import update
    import models

    try:
        async with db_session_factory() as session:
            await session.execute(
                update(models.Post)
                .where(models.Post.id == post_id)
                .values(view_count=models.Post.view_count + 1)
            )
            await session.commit()
        logger.info(f"[BACKGROUND TASK] ✅ View count incremented for post {post_id}")
    except Exception as e:
        logger.error(f"[BACKGROUND TASK] ❌ Failed to increment view count: {e}")
        # CONCEPT: Background tasks should NEVER crash silently
        # Always log errors — you won't get an HTTP response to surface them
