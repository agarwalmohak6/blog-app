# =============================================================================
# routers/auth.py — Authentication Endpoints
# =============================================================================
# CONCEPT: APIRouter
#   Instead of defining all routes in main.py, we split them into routers.
#   Each router handles one "resource" (auth, posts, comments...).
#   main.py then includes them with a prefix: app.include_router(router, prefix="/auth")
#   This is the "separation of concerns" principle.
#   Docs: https://fastapi.tiangolo.com/tutorial/bigger-applications/
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
import models, schemas
from auth import hash_password, verify_password, create_access_token, get_current_user
from tasks import send_welcome_email

router = APIRouter(tags=["Authentication"])

# =============================================================================
# POST /auth/register
# =============================================================================
@router.post(
    "/register",
    response_model=schemas.TokenResponse,  # defines the response shape + auto-docs
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_data: schemas.UserRegister,         # Pydantic validates the request body
    background_tasks: BackgroundTasks,        # FastAPI injects this automatically
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.

    CONCEPT: Request Flow:
    1. Pydantic validates user_data (types, lengths, email format, custom validators)
    2. We check for duplicate email/username in DB
    3. Hash the password (NEVER store plain text)
    4. Save to DB
    5. Queue welcome email as background task
    6. Return JWT token (user is immediately logged in after registering)
    """

    # Check for existing email
    existing = await db.execute(
        select(models.User).where(models.User.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        # 409 Conflict = resource already exists
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Check for existing username
    existing_username = await db.execute(
        select(models.User).where(models.User.username == user_data.username)
    )
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken"
        )

    # Create user with hashed password
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        bio=user_data.bio,
    )
    db.add(new_user)
    await db.flush()   # flush = send SQL to DB but don't commit yet, gets the auto-generated id
    await db.refresh(new_user)  # reload from DB to get server-generated fields (id, created_at)

    # Queue welcome email — runs AFTER response is sent
    background_tasks.add_task(send_welcome_email, str(new_user.email), str(new_user.username))

    # Create JWT token — user is logged in immediately
    token = create_access_token({"sub": str(new_user.id)})
    return schemas.TokenResponse(
        access_token=token,
        user_id=new_user.id,  # type: ignore
        username=new_user.username,  # type: ignore
    )


# =============================================================================
# POST /auth/login
# =============================================================================
@router.post(
    "/login",
    response_model=schemas.TokenResponse,
    summary="Login with email and password",
)
async def login(
    credentials: schemas.UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user and return a JWT token.

    CONCEPT: Timing-safe comparison
    We always run verify_password() even if user doesn't exist.
    This prevents "timing attacks" where an attacker could infer whether
    an email exists by measuring how fast the server responds.
    """
    result = await db.execute(
        select(models.User).where(models.User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    # CONCEPT: Use the same error for "wrong email" and "wrong password"
    # Never tell attackers WHICH field was wrong (security best practice)
    if not user or not verify_password(credentials.password, str(user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_active is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        user_id=user.id,  # type: ignore
        username=user.username,  # type: ignore
    )


# =============================================================================
# GET /auth/me — Protected route example
# =============================================================================
@router.get(
    "/me",
    response_model=schemas.UserResponse,
    summary="Get current logged-in user",
)
async def get_me(
    # CONCEPT: Depends(get_current_user) = "this route requires authentication"
    # FastAPI calls get_current_user() which reads the Authorization header,
    # validates the JWT, and returns the User object — or raises 401.
    current_user: models.User = Depends(get_current_user),
):
    return current_user
