from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    get_password_hash, verify_password, create_access_token, create_refresh_token,
    generate_totp_secret, get_totp_uri, verify_totp
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, RegisterRequest, Token, TwoFASetupResponse,
    TwoFAEnableRequest, TwoFADisableRequest
)
from app.schemas.user import UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        is_superuser=False,  # first user can be made superuser manually if needed
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is inactive")
    
    # 2FA check
    if user.is_2fa_enabled:
        if not data.totp_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="2FA code required",
                headers={"X-2FA-Required": "true"}
            )
        if not user.totp_secret or not verify_totp(user.totp_secret, data.totp_code):
            raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    await db.commit()
    
    uri = get_totp_uri(secret, current_user.email)
    return TwoFASetupResponse(secret=secret, qr_code_uri=uri)


@router.post("/2fa/enable")
async def enable_2fa(
    data: TwoFAEnableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Call /2fa/setup first")
    
    if not verify_totp(current_user.totp_secret, data.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    current_user.is_2fa_enabled = True
    await db.commit()
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def disable_2fa(
    data: TwoFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    if not current_user.totp_secret or not verify_totp(current_user.totp_secret, data.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    await db.commit()
    return {"message": "2FA disabled successfully"}
