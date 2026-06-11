from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models import AuthToken, User
from app.schemas import AuthLogin, AuthRegister, AuthResponse, UserRead
from app.services.security import (
    create_token,
    hash_password,
    hash_token,
    normalize_email,
    token_expiry,
    verify_password,
)

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: AuthRegister, session: SessionDep) -> AuthResponse:
    email = normalize_email(payload.email)
    existing = await session.scalar(select(User).where(User.email == email))

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
    )
    session.add(user)
    await session.flush()
    token = create_token()
    session.add(
        AuthToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=token_expiry(),
        )
    )
    await session.commit()
    await session.refresh(user)

    return AuthResponse(token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: AuthLogin, session: SessionDep) -> AuthResponse:
    email = normalize_email(payload.email)
    user = await session.scalar(select(User).where(User.email == email))

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_token()
    session.add(
        AuthToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=token_expiry(),
        )
    )
    await session.commit()
    await session.refresh(user)

    return AuthResponse(token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUserDep) -> User:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: CurrentUserDep, session: SessionDep) -> None:
    result = await session.execute(
        select(AuthToken)
        .where(AuthToken.user_id == current_user.id)
        .where(AuthToken.revoked_at.is_(None))
    )

    for auth_token in result.scalars():
        auth_token.revoked_at = datetime.now(UTC)

    await session.commit()
