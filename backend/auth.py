# =============================================================================
# auth.py — JWT Authentication (JSON Web Tokens)
# =============================================================================
# CONCEPT: How JWT Auth Works (step by step)
#
#  1. User sends email + password to POST /auth/login
#  2. Server verifies password against the stored hash
#  3. Server creates a JWT token: a signed string containing user info
#  4. Client stores the token (localStorage / memory)
#  5. Client sends token in every request: Authorization: Bearer <token>
#  6. Server verifies the token's signature → extracts user info → no DB lookup!
#
# Why JWT over sessions?
#   Sessions store state on the server (DB/Redis lookup on every request).
#   JWTs are stateless — the token itself contains the user info, verified
#   by cryptographic signature. Scales horizontally with no shared state.
#
# Docs: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
# JWT spec: https://jwt.io/introduction
# =============================================================================

from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from passlib.context import CryptContext  # passlib for password hashing
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
import models
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

# CONCEPT: Secret Key — used to SIGN tokens. If someone has this, they can
# forge tokens. In production: use a long random string from a secrets manager.
# NEVER hardcode in production. Read from environment variables.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-please")

# Algorithm used to sign the JWT. HS256 = HMAC + SHA-256 (symmetric signing)
ALGORITHM = "HS256"

# How long the token is valid. After this, the user must log in again.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# =============================================================================
# PASSWORD HASHING
# =============================================================================
# CONCEPT: bcrypt is an adaptive hashing algorithm.
# "Adaptive" means you can increase the work factor (rounds) as CPUs get faster,
# keeping brute-force attacks slow even on modern hardware.
# Never store plaintext passwords — always hash + compare hashes.
# Docs: https://passlib.readthedocs.io/en/stable/lib/passlib.context.html
# =============================================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt. One-way operation."""
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a stored hash.
    CONCEPT: We never 'decrypt' — we hash the input and compare hashes.
    """
    return pwd_context.verify(plain_password, hashed_password)

# =============================================================================
# JWT TOKEN CREATION & VERIFICATION
# =============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT token.

    CONCEPT: JWT Structure — 3 base64-encoded parts separated by dots:
      Header.Payload.Signature

      Header:    {"alg": "HS256", "typ": "JWT"}
      Payload:   your data (sub, exp, etc.)  — NOT encrypted, just encoded!
      Signature: HMAC(header + payload, SECRET_KEY) — proves authenticity

    The payload is readable by anyone — NEVER put sensitive data in it.
    The signature is what prevents tampering.
    """
    to_encode = data.copy()

    # Set expiration time — standard JWT claim "exp"
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    # jwt.encode signs the payload with our SECRET_KEY
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    Returns the payload dict if valid, None if invalid/expired.

    CONCEPT: jwt.decode:
      1. Splits the token into header, payload, signature
      2. Re-computes the signature using SECRET_KEY
      3. Compares — if they match, token is authentic (not tampered)
      4. Checks the "exp" claim — rejects expired tokens
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None  # invalid signature, expired, or malformed


# =============================================================================
# FASTAPI OAUTH2 SCHEME
# =============================================================================
# CONCEPT: OAuth2PasswordBearer
# This tells FastAPI how to extract the token from incoming requests.
# It looks for: Authorization: Bearer <token>  in the request headers.
# tokenUrl="/auth/login" is used by the auto-generated Swagger UI only.
# Docs: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
# =============================================================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# =============================================================================
# DEPENDENCY: get_current_user
# =============================================================================
# CONCEPT: FastAPI Dependency Injection chain
# Routes declare: current_user = Depends(get_current_user)
# FastAPI calls get_current_user() which itself Depends(oauth2_scheme) and
# Depends(get_db) — FastAPI resolves the whole chain automatically.
#
# This pattern is called "Dependency Chain" or "Dependency Graph"
# Docs: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-in-path-operation-decorators/
# =============================================================================
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> models.User:
    """
    Extract and validate the current user from the JWT token.
    This is a 'protected route' dependency — raises 401 if token is invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},  # OAuth2 standard header
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # "sub" (subject) is the standard JWT claim for the user identifier
    user_id_obj = payload.get("sub")
    if not isinstance(user_id_obj, str):
        raise credentials_exception
    user_id: str = user_id_obj

    # Look up user in DB to ensure they still exist and are active
    result = await db.execute(
        select(models.User).where(models.User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None or user.is_active is not True:
        raise credentials_exception

    return user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[models.User]:
    """
    Like get_current_user but returns None instead of raising 401.
    Used for routes that work for both logged-in and anonymous users.
    """
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
