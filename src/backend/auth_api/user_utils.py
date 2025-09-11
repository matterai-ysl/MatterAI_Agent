import sys
import os
from typing import Dict, Optional

# Add parent directory to path to import database module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import db_manager

async def create_user(name: str, email: str, password: str, is_admin: bool = False, email_verified: bool = False) -> Dict:
    """Create a new user"""
    print(f"Creating new user with email: {email} (verified: {email_verified})")
    
    try:
        user = await db_manager.create_user(
            name=name,
            email=email,
            password=password,
            is_admin=is_admin,
            email_verified=email_verified
        )
        print(f"User created successfully: {user['email']}")
        return user
    except ValueError as e:
        print(f"User creation failed: {str(e)}")
        raise
    except Exception as e:
        print(f"Unexpected error during user creation: {str(e)}")
        raise

async def verify_user(email: str, password: str) -> Optional[Dict]:
    """Verify user credentials"""
    print(f"Verifying user credentials for: {email}")
    
    try:
        user = await db_manager.verify_user(email, password)
        if user:
            print(f"User verification successful: {email}")
            return user
        else:
            print(f"User verification failed: {email}")
            return None
    except Exception as e:
        print(f"Error during user verification: {str(e)}")
        return None

async def change_password(email: str, current_password: str, new_password: str) -> bool:
    """Change user password"""
    print(f"Attempting to change password for user: {email}")
    
    try:
        success = await db_manager.change_password(email, current_password, new_password)
        if success:
            print(f"Password changed successfully for: {email}")
        else:
            print(f"Password change failed for: {email}")
        return success
    except Exception as e:
        print(f"Error changing password: {str(e)}")
        return False

async def get_user_by_email(email: str) -> Optional[Dict]:
    """Find user by email"""
    try:
        user = await db_manager.get_user_by_email(email)
        if user:
            print(f"Found user with email: {email}")
            # Remove password_hash from response
            user_response = user.copy()
            user_response.pop('password_hash', None)
            return user_response
        else:
            print(f"No user found with email: {email}")
            return None
    except Exception as e:
        print(f"Error getting user by email: {str(e)}")
        return None 