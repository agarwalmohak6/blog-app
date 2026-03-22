# =============================================================================
# main.py — FastAPI Application Entry Point
# =============================================================================
# CONCEPT: This is the "composition root" — where everything is wired together.
# We create the FastAPI app, configure middleware, include routers, and define
# startup/shutdown lifecycle events.
#
# FastAPI is built on top of Starlette (ASGI framework) and Pydantic.
# ASGI (Async Server Gateway Interface) is the async successor to WSGI.
# Docs: https://fastapi.tiangolo.com/
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from database import engine, Base, AsyncSessionLocal
from routers import auth, posts, comments
from content_utils import ensure_unique_slug, normalize_post_payload
import models


async def apply_development_schema_updates():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug VARCHAR(320)"))
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt VARCHAR(240)"))
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title VARCHAR(300)"))
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_description VARCHAR(320)"))
        await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_posts_slug ON posts (slug)"))


async def sync_existing_post_metadata():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id FROM posts"))
        post_ids = [row[0] for row in result.all()]
        if not post_ids:
            await session.commit()
            return

        orm_posts = await session.execute(
            text(
                "SELECT id, title, body, slug, excerpt, seo_title, seo_description, is_published, published_at FROM posts"
            )
        )
        rows = orm_posts.mappings().all()
        for row in rows:
            payload = normalize_post_payload(dict(row))
            if not row["slug"]:
                payload["slug"] = await ensure_unique_slug(session, row["title"], None, exclude_post_id=row["id"])
            await session.execute(
                text(
                    """
                    UPDATE posts
                    SET slug = :slug,
                        excerpt = :excerpt,
                        seo_title = :seo_title,
                        seo_description = :seo_description,
                        published_at = COALESCE(published_at, :published_at)
                    WHERE id = :id
                    """
                ),
                {
                    "id": row["id"],
                    "slug": payload["slug"],
                    "excerpt": payload["excerpt"],
                    "seo_title": payload["seo_title"],
                    "seo_description": payload["seo_description"],
                    "published_at": payload.get("published_at"),
                },
            )
        await session.commit()

# =============================================================================
# LIFESPAN — Startup & Shutdown Events
# =============================================================================
# CONCEPT: Lifespan context manager (replaces deprecated @app.on_event)
# Code BEFORE yield runs on startup (app is starting up)
# Code AFTER yield runs on shutdown (app is closing down)
# Use for: DB connection setup, loading ML models, connecting to Redis, etc.
# Docs: https://fastapi.tiangolo.com/advanced/events/
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- STARTUP ----
    print("🚀 Starting Blog API...")

    # Create all tables defined in models.py
    # CONCEPT: create_all() reads the metadata from Base and issues
    # CREATE TABLE IF NOT EXISTS statements for every model class.
    # In production, use Alembic migrations instead of create_all().
    # Docs: https://alembic.sqlalchemy.org/
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await apply_development_schema_updates()
    await sync_existing_post_metadata()
    print("✅ Database tables ready")

    yield  # <-- app runs here

    # ---- SHUTDOWN ----
    print("🛑 Shutting down Blog API...")
    await engine.dispose()  # close all DB connections gracefully
    print("✅ Database connections closed")


# =============================================================================
# APP INSTANCE
# =============================================================================
app = FastAPI(
    title="Blog API",
    description="A full-featured blog API built with FastAPI + PostgreSQL",
    version="1.0.0",
    lifespan=lifespan,
    # These URLs are where the auto-generated API docs live:
    docs_url="/docs",      # Swagger UI — interactive API explorer
    redoc_url="/redoc",    # ReDoc — clean API documentation
)

# =============================================================================
# CORS MIDDLEWARE
# =============================================================================
# CONCEPT: CORS (Cross-Origin Resource Sharing)
#   Browsers block JS from making requests to a DIFFERENT origin (domain/port).
#   Your React app runs on http://localhost:5173 (Vite)
#   Your API runs on http://localhost:8000 (FastAPI)
#   These are different origins → browser blocks the request!
#
#   CORS middleware adds HTTP headers that tell the browser "it's OK":
#     Access-Control-Allow-Origin: http://localhost:5173
#
#   allow_credentials=True: allows cookies and Authorization headers
#   allow_methods=["*"]: allows GET, POST, PATCH, DELETE, etc.
#   allow_headers=["*"]: allows custom headers like Authorization
#
#   In production: restrict allow_origins to your actual domain(s)!
#   Docs: https://fastapi.tiangolo.com/tutorial/cors/
# =============================================================================
# IMPORTANT: add_middleware() wraps in reverse — last-added runs FIRST.
# CORS must run outermost (first) so preflight requests are handled before
# GZip ever touches them. Add CORS last so it wraps around everything.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA dev server (if used)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compresses the response body — added before CORS so it runs after CORS
# (inner layer). Compresses responses >500 bytes by ~70%.
app.add_middleware(GZipMiddleware, minimum_size=500)

# =============================================================================
# ROUTERS
# =============================================================================
# CONCEPT: include_router mounts a router at a URL prefix.
# All routes in routers/auth.py become /auth/...
# All routes in routers/posts.py become /posts/...
# =============================================================================
app.include_router(auth.router,     prefix="/auth")
app.include_router(posts.router,    prefix="/posts")
app.include_router(comments.router, prefix="")  # /posts/{id}/comments

# =============================================================================
# ROOT ENDPOINT — Health Check
# =============================================================================
@app.get("/", tags=["Health"])
async def root():
    """
    Health check endpoint.
    CONCEPT: Health checks are used by load balancers and orchestrators (k8s)
    to know if the service is running and ready to accept traffic.
    """
    return {
        "status": "healthy",
        "service": "Blog API",
        "version": "1.0.0",
        "docs": "/docs",
    }


# =============================================================================
# RUN WITH UVICORN
# =============================================================================
# CONCEPT: Uvicorn is an ASGI server — it runs our FastAPI app.
# --reload: auto-restarts on code changes (development only)
# --workers: number of worker processes (use for production)
#
# To run: uvicorn main:app --reload --port 8000
# Or:     python main.py (uses the block below)
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,    # hot reload for development
        log_level="info",
    )
