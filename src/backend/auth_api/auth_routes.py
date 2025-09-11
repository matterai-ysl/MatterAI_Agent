from fastapi import APIRouter, HTTPException, Depends, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

from auth_api.models import (
    UserCreate, UserLogin, UserPasswordChange, TokenResponse,
    SendVerificationCodeRequest, VerifyCodeRequest, 
    RegisterWithVerificationRequest, PasswordResetRequest, EmailBindingRequest
)
from auth_api.user_utils import create_user, verify_user, change_password
from auth_api.email_service import email_service

# Secret key for JWT encoding/decoding - in production, use a secure environment variable
SECRET_KEY = "your-secret-key-should-be-very-long-and-secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # No need to verify against database as we're just checking JWT validity
    return payload


@router.post("/verify")
async def verify_token(token: str = None, token_data: dict = Body(None)):
    """
    验证 Token 并返回用户信息
    接受查询参数或请求体中的token
    """
    # 从请求体中获取token (如果提供)
    if token_data and "token" in token_data:
        token = token_data["token"]
    
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    print(token)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # 假设 sub 是用户 ID
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "status": "verified"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        print(f"Received registration request for: {user_data.email}")
        
        user = await create_user(
            name=user_data.name or user_data.email.split('@')[0],
            email=user_data.email,
            password=user_data.password
        )
        
        print(f"User created successfully, generating token for: {user['email']}")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "id": user["id"], "isAdmin": user["isAdmin"]},
            expires_delta=access_token_expires
        )
        
        print(f"Registration complete for: {user['email']}")
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "token": access_token,
            "isAdmin": user["isAdmin"]
        }
    except ValueError as e:
        print(f"Registration error for {user_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login_user(user_data: UserLogin):
    """Login a user"""
    user = await verify_user(email=user_data.email, password=user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"], "isAdmin": user["isAdmin"]},
        expires_delta=access_token_expires
    )
    print("登录成功, access_token:",access_token)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "token": access_token,
        "isAdmin": user["isAdmin"]
    }


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def update_password(password_data: UserPasswordChange, current_user: dict = Depends(get_current_user)):
    """Change user password"""
    # Verify that the user is changing their own password
    if current_user["sub"].lower() != password_data.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password"
        )
    
    success = await change_password(
        email=password_data.email,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=dict)
async def get_user_me(current_user: dict = Depends(get_current_user)):
    """Get current user info with complete profile"""
    try:
        # Import the database manager
        from database import db_manager
        
        # Get complete user info from database
        user = await db_manager.get_user_by_id(current_user["id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "isAdmin": user["isAdmin"],
            "emailVerified": user["emailVerified"],
            "verificationEmail": user["verificationEmail"],
            "createdAt": user["createdAt"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )


# Email verification endpoints
@router.post("/send-verification-code")
async def send_verification_code(request: SendVerificationCodeRequest):
    """Send verification code to email"""
    try:
        result = await email_service.send_verification_code(
            email=request.email, 
            purpose=request.purpose
        )
        return result
    except Exception as e:
        print(f"❌ Error sending verification code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="发送验证码失败，请稍后重试"
        )


@router.post("/verify-code")
async def verify_verification_code(request: VerifyCodeRequest):
    """Verify verification code"""
    try:
        result = email_service.verify_code(
            email=request.email,
            code=request.code,
            purpose=request.purpose
        )
        return result
    except Exception as e:
        print(f"❌ Error verifying code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="验证码验证失败，请稍后重试"
        )


@router.post("/register-with-verification", response_model=TokenResponse)
async def register_with_verification(request: RegisterWithVerificationRequest):
    """Register user with email verification"""
    try:
        # First verify the verification code
        verify_result = email_service.verify_code(
            email=request.email,
            code=request.verification_code,
            purpose="register"
        )
        
        if not verify_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=verify_result["message"]
            )
        
        # Create user with verified email
        user = await create_user(
            name=request.name or request.email.split('@')[0],
            email=request.email,
            password=request.password,
            email_verified=True  # Mark as verified since code was verified
        )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "id": user["id"], "isAdmin": user["isAdmin"]},
            expires_delta=access_token_expires
        )
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "token": access_token,
            "isAdmin": user["isAdmin"],
            "emailVerified": user["emailVerified"]
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ Error in register with verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请稍后重试"
        )


@router.post("/reset-password")
async def reset_password(request: PasswordResetRequest):
    """Reset password with email verification"""
    try:
        # Verify the verification code
        verify_result = email_service.verify_code(
            email=request.email,
            code=request.verification_code,
            purpose="password_reset"
        )
        
        if not verify_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=verify_result["message"]
            )
        
        # Import the database manager
        from database import db_manager
        
        # Reset password
        success = await db_manager.reset_password_with_email(
            email=request.email,
            new_password=request.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码重置失败，请确保邮箱已验证"
            )
        
        return {"message": "密码重置成功"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码重置失败，请稍后重试"
        )


@router.post("/bind-email")
async def bind_email(request: EmailBindingRequest, current_user: dict = Depends(get_current_user)):
    """Bind new email to user account"""
    try:
        # Verify the verification code
        verify_result = email_service.verify_code(
            email=request.new_email,
            code=request.verification_code,
            purpose="email_binding"
        )
        
        if not verify_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=verify_result["message"]
            )
        
        # Import the database manager
        from database import db_manager
        
        # First, set verification email
        success = await db_manager.update_verification_email(
            user_id=current_user["id"],
            verification_email=request.new_email
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="邮箱绑定失败"
            )
        
        # Then confirm the binding
        success = await db_manager.confirm_email_binding(
            user_id=current_user["id"]
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="邮箱绑定确认失败"
            )
        
        return {"message": "邮箱绑定成功"}
        
    except Exception as e:
        print(f"❌ Error binding email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="邮箱绑定失败，请稍后重试"
        ) 