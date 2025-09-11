from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPasswordChange(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: str
    isAdmin: bool = False
    emailVerified: bool = False
    verificationEmail: Optional[str] = None
    createdAt: datetime

class TokenResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    token: str
    isAdmin: bool = False
    emailVerified: bool = False

# Email verification models
class SendVerificationCodeRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(..., pattern="^(register|password_reset|email_binding)$")

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    purpose: str = Field(..., pattern="^(register|password_reset|email_binding)$")

class RegisterWithVerificationRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    verification_code: str = Field(..., min_length=6, max_length=6)
    name: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)
    verification_code: str = Field(..., min_length=6, max_length=6)

class EmailBindingRequest(BaseModel):
    new_email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6) 