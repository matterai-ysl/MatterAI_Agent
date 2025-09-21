from fastapi import APIRouter, HTTPException, Depends, status, Body
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

from auth_api.models import (
    UserCreate, UserLogin, UserPasswordChange, TokenResponse,
    SendVerificationCodeRequest, VerifyCodeRequest, 
    RegisterWithVerificationRequest, PasswordResetRequest, EmailBindingRequest
)
from auth_api.user_utils import create_user, verify_user, change_password, get_user_by_email
from auth_api.email_service import email_service

# Secret key for JWT encoding/decoding - in production, use a secure environment variable
SECRET_KEY = "your-secret-key-should-be-very-long-and-secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["Authentication"])
@router.get("/debug/email-exists")
async def debug_email_exists(email: str):
    """调试：检查邮箱是否存在（标准化后）"""
    try:
        normalized = email.strip().lower()
        user = await get_user_by_email(normalized)
        return {"normalized": normalized, "exists": bool(user)}
    except Exception as e:
        return {"error": str(e)}


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
        normalized_email = user_data.email.strip().lower()
        print(f"Received registration request for: {normalized_email}")
        # Pre-check: email already exists
        existing = await get_user_by_email(normalized_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已注册"
            )
        
        user = await create_user(
            name=user_data.name or normalized_email.split('@')[0],
            email=normalized_email,
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
        normalized_email = request.email.strip().lower()
        # Pre-check: email already exists
        existing = await get_user_by_email(normalized_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已注册"
            )

        # First verify the verification code
        verify_result = email_service.verify_code(
            email=normalized_email,
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
            name=request.name or normalized_email.split('@')[0],
            email=normalized_email,
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


# SSO (Single Sign-On) endpoints
@router.get("/sso")
async def sso_login(token: str, redirect_to: str = "/"):
    """
    单点登录接口 - A网站跳转B网站免登录
    接收A网站的token，验证后重定向到B网站前端
    """
    print("=" * 60)
    print("🚀 SSO LOGIN STARTED")
    print(f"📥 接收到参数:")
    print(f"   token (前20字符): {token[:20]}...")
    print(f"   redirect_to: {redirect_to}")
    print(f"   token长度: {len(token)}")

    try:
        print(f"🔍 开始验证token...")
        print(f"🔑 使用SECRET_KEY: {SECRET_KEY[:10]}...")
        print(f"🔑 使用ALGORITHM: {ALGORITHM}")

        # 验证token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ Token解码成功!")
        print(f"📄 Token payload: {payload}")

        user_email = payload.get("sub")
        user_id = payload.get("id")
        is_admin = payload.get("isAdmin")

        print(f"👤 从token提取信息:")
        print(f"   user_email: {user_email}")
        print(f"   user_id: {user_id}")
        print(f"   is_admin: {is_admin}")

        if not user_email or not user_id:
            print(f"❌ Token payload缺少必要字段!")
            print(f"   需要: sub, id")
            print(f"   实际: {list(payload.keys())}")
            return RedirectResponse(url="/agent/auth?error=invalid_token")

        print(f"🔍 验证用户是否存在: {user_email}")

        # 验证用户是否存在
        user = await get_user_by_email(user_email)
        if not user:
            print(f"❌ 数据库中未找到用户: {user_email}")
            return RedirectResponse(url="/agent/auth?error=user_not_found")

        print(f"✅ 用户验证成功!")
        print(f"👤 用户信息: id={user['id']}, email={user['email']}, name={user['name']}")

        print(f"🔐 生成新的SSO token...")

        # 生成新的token（更安全的做法）
        new_token_data = {"sub": user["email"], "id": user["id"], "isAdmin": user["isAdmin"]}
        print(f"📄 新token数据: {new_token_data}")

        new_token = create_access_token(
            data=new_token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        print(f"✅ 新token生成成功! (前20字符): {new_token[:20]}...")

        # 安全重定向，只允许内部路径
        safe_redirect = redirect_to if redirect_to.startswith('/') else '/'

        # 考虑前端部署路径前缀 /agent/
        if not safe_redirect.startswith('/agent/'):
            if safe_redirect == '/':
                safe_redirect = '/agent/'
            else:
                safe_redirect = f"/agent{safe_redirect}"

        redirect_url = f"{safe_redirect}?sso_token={new_token}&sso=true"

        print(f"🔄 准备重定向:")
        print(f"   目标URL: {redirect_url}")
        print(f"   包含参数:")
        print(f"     - sso_token: {new_token[:20]}...")
        print(f"     - sso: true")
        print("✅ SSO LOGIN SUCCESSFUL - 即将重定向")
        print("=" * 60)

        return RedirectResponse(url=redirect_url)

    except jwt.ExpiredSignatureError:
        print("❌ SSO Token已过期")
        print("=" * 60)
        return RedirectResponse(url="/agent/auth?error=token_expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ SSO Token无效: {e}")
        print(f"   Token: {token}")
        print(f"   Error详情: {str(e)}")
        print("=" * 60)
        return RedirectResponse(url="/agent/auth?error=invalid_token")
    except Exception as e:
        print(f"❌ SSO处理出错: {e}")
        print(f"   错误类型: {type(e).__name__}")
        print(f"   错误详情: {str(e)}")
        import traceback
        print(f"   调用栈: {traceback.format_exc()}")
        print("=" * 60)
        return RedirectResponse(url="/agent/auth?error=sso_failed")


@router.post("/sso/verify", response_model=TokenResponse)
async def verify_sso_token(sso_token: str = Body(..., embed=True)):
    """
    验证SSO token并返回用户信息
    前端收到sso_token后调用此接口验证并获取用户信息
    """
    print("=" * 50)
    print("🔍 SSO TOKEN VERIFICATION STARTED")
    print(f"📥 接收到SSO token (前20字符): {sso_token[:20]}...")
    print(f"📏 Token长度: {len(sso_token)}")

    try:
        print(f"🔑 使用配置:")
        print(f"   SECRET_KEY: {SECRET_KEY[:10]}...")
        print(f"   ALGORITHM: {ALGORITHM}")

        # 验证token
        payload = jwt.decode(sso_token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ SSO Token解码成功!")
        print(f"📄 Payload内容: {payload}")

        user_email = payload.get("sub")
        user_id = payload.get("id")
        is_admin = payload.get("isAdmin")

        print(f"👤 提取的用户信息:")
        print(f"   email: {user_email}")
        print(f"   id: {user_id}")
        print(f"   isAdmin: {is_admin}")

        if not user_email or not user_id:
            print(f"❌ Token payload缺少必要字段!")
            print(f"   需要: sub, id")
            print(f"   实际: {list(payload.keys())}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SSO token - missing required fields"
            )

        # 获取完整用户信息
        print(f"🔍 从数据库查询用户: {user_email}")
        user = await get_user_by_email(user_email)
        if not user:
            print(f"❌ 数据库中未找到用户: {user_email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database"
            )

        print(f"✅ 用户查询成功!")
        print(f"👤 数据库用户信息:")
        print(f"   id: {user['id']}")
        print(f"   email: {user['email']}")
        print(f"   name: {user['name']}")
        print(f"   isAdmin: {user['isAdmin']}")
        print(f"   emailVerified: {user.get('emailVerified', False)}")

        response_data = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "token": sso_token,
            "isAdmin": user["isAdmin"],
            "emailVerified": user.get("emailVerified", False)
        }

        print(f"✅ SSO验证成功!")
        print(f"📤 返回数据: {response_data}")
        print("=" * 50)

        return response_data

    except jwt.ExpiredSignatureError:
        print("❌ SSO Token已过期")
        print("=" * 50)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SSO token expired"
        )
    except jwt.InvalidTokenError as e:
        print(f"❌ SSO Token无效: {e}")
        print(f"   Token: {sso_token}")
        print(f"   Error详情: {str(e)}")
        print("=" * 50)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO token"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ SSO验证出错: {e}")
        print(f"   错误类型: {type(e).__name__}")
        print(f"   错误详情: {str(e)}")
        import traceback
        print(f"   调用栈: {traceback.format_exc()}")
        print("=" * 50)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SSO verification failed"
        ) 