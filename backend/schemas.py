# =============================================================================
# schemas.py — Pydantic v2 Schemas (Request/Response Validation)
# =============================================================================
# CONCEPT: Pydantic vs SQLAlchemy Models — What's the difference?
#
#   SQLAlchemy models (models.py)  → represent DB tables, used internally
#   Pydantic schemas (this file)   → represent API input/output, used at the
#                                    HTTP boundary (what comes IN and goes OUT)
#
# Why separate them?
#   - Security: You never want to expose hashed_password in an API response
#   - Flexibility: API shape != DB shape (e.g., computed fields, nested data)
#   - Validation: Pydantic automatically validates types, lengths, formats
#
# Docs: https://docs.pydantic.dev/latest/
# =============================================================================

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime

# =============================================================================
# BASE PATTERN — Shared + Create + Response schemas per resource
# =============================================================================
# PATTERN: We use 3 schema types per resource:
#   1. Base     → shared fields (used in Create and Response)
#   2. Create   → what the client SENDS (input validation)
#   3. Response → what the server RETURNS (output shape)
#
# This avoids duplication while keeping input/output separate.
# =============================================================================


# =============================================================================
# AUTH SCHEMAS
# =============================================================================

class UserRegister(BaseModel):
    """Schema for POST /auth/register — what the client sends"""
    username: str = Field(..., min_length=3, max_length=50)  # ... means required
    email: EmailStr                                            # validates email format
    password: str = Field(..., min_length=8, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)

    # CONCEPT: field_validator — custom validation logic
    # Runs AFTER type validation. Raise ValueError to reject the input.
    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores allowed)")
        return v.lower()  # normalize to lowercase


class UserLogin(BaseModel):
    """Schema for POST /auth/login"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """What we return after successful login"""
    access_token: str
    token_type: str = "bearer"  # standard OAuth2 token type
    user_id: int
    username: str


# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """Safe user data to return — NO password fields"""
    id: int
    is_active: bool
    created_at: datetime

    # CONCEPT: model_config with from_attributes=True
    # Tells Pydantic to read data from ORM object attributes (not just dicts)
    # Without this, Pydantic can't read SQLAlchemy model instances
    # Previously called: class Config: orm_mode = True  (Pydantic v1 syntax)
    model_config = {"from_attributes": True}


# =============================================================================
# POST SCHEMAS
# =============================================================================

class PostBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    body: str  = Field(..., min_length=10)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[str] = None  # "python,fastapi,tutorial"
    excerpt: Optional[str] = Field(None, max_length=240)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    seo_title: Optional[str] = Field(None, max_length=300)
    seo_description: Optional[str] = Field(None, max_length=320)
    slug: Optional[str] = Field(None, max_length=320)


class PostCreate(PostBase):
    """Client sends this to create a post"""
    is_published: bool = True


class PostUpdate(BaseModel):
    """Partial update — all fields optional (PATCH semantics)"""
    # CONCEPT: Optional fields with None default = PATCH (partial update)
    # vs PostCreate where fields are required = POST (full create)
    title:        Optional[str] = None
    body:         Optional[str] = None
    category:     Optional[str] = None
    tags:         Optional[str] = None
    excerpt:      Optional[str] = Field(None, max_length=240)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    seo_title: Optional[str] = Field(None, max_length=300)
    seo_description: Optional[str] = Field(None, max_length=320)
    slug: Optional[str] = Field(None, max_length=320)
    is_published: Optional[bool] = None


class PostResponse(PostBase):
    """What the API returns for a post"""
    id:           int
    author_id:    int
    is_published: bool
    view_count:   int
    published_at: Optional[datetime] = None
    created_at:   datetime
    updated_at:   Optional[datetime] = None
    author:       Optional[UserResponse] = None    # nested object!
    comments:     Optional[List["CommentResponse"]] = []  # nested list!

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    """Paginated list of posts"""
    posts:   List[PostResponse]
    total:   int          # total count for frontend pagination
    page:    int
    limit:   int
    has_more: bool        # convenience field for infinite scroll

    model_config = {"from_attributes": True}


class ArchiveSummary(BaseModel):
    year: int
    month: int
    label: str
    count: int


class TagSummary(BaseModel):
    tag: str
    count: int


class AuthorProfileResponse(BaseModel):
    user: UserResponse
    posts_count: int
    total_views: int
    recent_posts: List[PostResponse]


# =============================================================================
# COMMENT SCHEMAS
# =============================================================================

class CommentBase(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentCreate(CommentBase):
    """Client sends this to create a comment"""
    post_id: int


class CommentResponse(CommentBase):
    id:         int
    post_id:    int
    author_id:  int
    created_at: datetime
    author:     Optional[UserResponse] = None

    model_config = {"from_attributes": True}


# =============================================================================
# BOOKMARK SCHEMAS
# =============================================================================

class BookmarkCreate(BaseModel):
    post_id: int


class BookmarkResponse(BaseModel):
    id:         int
    user_id:    int
    post_id:    int
    created_at: datetime
    post:       Optional[PostResponse] = None

    model_config = {"from_attributes": True}


# =============================================================================
# GENERIC RESPONSE SCHEMAS
# =============================================================================

class MessageResponse(BaseModel):
    """Simple success message"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Standard error shape"""
    detail: str
    code:   Optional[str] = None


# CONCEPT: Rebuild model — needed when schemas reference each other (circular refs)
# PostResponse has CommentResponse, CommentResponse has UserResponse
# model_rebuild() resolves these forward references after all classes are defined
PostResponse.model_rebuild()
