# models.py — SQLAlchemy ORM Models (Database Tables as Python Classes)
# =============================================================================
# CONCEPT: ORM (Object Relational Mapping)
#   Instead of writing SQL like:
#       CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR UNIQUE ...);
#   You write a Python class and SQLAlchemy generates the SQL for you.
#   This means you work with Python objects, not raw SQL strings.
# Docs: https://docs.sqlalchemy.org/en/20/orm/mapping_styles.html
# =============================================================================

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, func, Index
)
from sqlalchemy.orm import relationship
from database import Base

# =============================================================================
# USER MODEL
# =============================================================================
class User(Base):
    # __tablename__ tells SQLAlchemy what to name the actual DB table
    __tablename__ = "users"

    # CONCEPT: Primary Key — uniquely identifies each row
    # Integer auto-increments: 1, 2, 3 ... automatically
    id       = Column(Integer, primary_key=True, index=True)

    # CONCEPT: Constraints — rules enforced at the DB level
    # unique=True means no two users can share an email (DB-level guarantee)
    # nullable=False means this column CANNOT be NULL (required field)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email    = Column(String(255), unique=True, nullable=False, index=True)

    # We never store plain-text passwords — always store the HASH
    # CONCEPT: Hashing is one-way (can't reverse). We verify by hashing the
    # input and comparing hashes, never decrypting.
    hashed_password = Column(String(255), nullable=False)

    bio        = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active  = Column(Boolean, default=True)

    # CONCEPT: server_default — the DB itself sets this value using NOW()
    # func.now() generates SQL: DEFAULT NOW()
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # -------------------------------------------------------------------------
    # RELATIONSHIPS
    # CONCEPT: Relationships let you navigate between related objects in Python.
    # user.posts → gives you all Post objects belonging to this user
    # back_populates="author" means Post.author → gives back the User object
    # lazy="selectin" = automatically load related data in a second SELECT
    # (avoids N+1 query problem common in ORMs)
    # Docs: https://docs.sqlalchemy.org/en/20/orm/relationships.html
    # -------------------------------------------------------------------------
    posts    = relationship("Post", back_populates="author", lazy="selectin")
    comments = relationship("Comment", back_populates="author", lazy="selectin")

    def __repr__(self):
        # CONCEPT: __repr__ is Python's "developer representation" of an object
        # Shown in debuggers, logs, and the REPL
        return f"<User id={self.id} username={self.username}>"


# =============================================================================
# POST MODEL
# =============================================================================
class Post(Base):
    __tablename__ = "posts"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(300), nullable=False)
    body       = Column(Text, nullable=False)
    slug       = Column(String(320), unique=True, nullable=True, index=True)
    excerpt    = Column(String(240), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    seo_title  = Column(String(300), nullable=True)
    seo_description = Column(String(320), nullable=True)
    category   = Column(String(100), nullable=True, index=True)  # indexed for fast filtering
    tags       = Column(String(500), nullable=True)               # comma-separated tags string

    # CONCEPT: ForeignKey — links this table to another table
    # "users.id" means this column references the id column in the users table
    # ondelete="CASCADE" = if the user is deleted, delete all their posts too
    author_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    is_published = Column(Boolean, default=True)
    view_count   = Column(Integer, default=0)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    # Many-to-one: many posts → one author
    author   = relationship("User", back_populates="posts")
    # One-to-many: one post → many comments
    comments = relationship("Comment", back_populates="post", lazy="selectin",
                            cascade="all, delete-orphan")  # delete comments with post

    def __repr__(self):
        return f"<Post id={self.id} title={self.title[:30]}>"

    # ---------------------------------------------------------------------------
    # PERFORMANCE OPTIMIZATION: Database Indexes
    # ---------------------------------------------------------------------------
    # Composite index on (category, created_at DESC)
    # Dramatically speeds up the common query: "posts in category X, newest first"
    __table_args__ = (
        Index("ix_posts_category_created", "category", "created_at"),
    )


# =============================================================================
# COMMENT MODEL
# =============================================================================
class Comment(Base):
    __tablename__ = "comments"

    id        = Column(Integer, primary_key=True, index=True)
    body      = Column(Text, nullable=False)
    post_id   = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post   = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")

    def __repr__(self):
        return f"<Comment id={self.id} post_id={self.post_id}>"


# =============================================================================
# BOOKMARK MODEL (Join Table pattern)
# =============================================================================
# CONCEPT: Join Table / Association Table
# A user can bookmark many posts, and a post can be bookmarked by many users.
# This is a Many-to-Many relationship, solved with a middle "join" table.
# The join table has TWO foreign keys, one to each side of the relationship.
# =============================================================================
class Bookmark(Base):
    __tablename__ = "bookmarks"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id    = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
