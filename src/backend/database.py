"""
Database connection and user authentication schema for MatterAI Agent
"""
import os
import asyncpg
import bcrypt
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'port': 5432,
    'database': os.getenv("DB_NAME"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD")
}

class DatabaseManager:
    """Database manager for user authentication"""
    
    def __init__(self):
        self.pool = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                host=DB_CONFIG['host'],
                port=DB_CONFIG['port'],
                database=DB_CONFIG['database'],
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password'],
                min_size=5,
                max_size=20
            )
            print("✅ Database connection pool initialized")
            await self.create_users_table()
        except Exception as e:
            print(f"❌ Failed to initialize database: {e}")
            raise
    
    async def create_users_table(self):
        """Create users table if it doesn't exist"""
        create_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            email_verified BOOLEAN DEFAULT FALSE,
            verification_email VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Set the starting value for the ID sequence to 10001
        SELECT setval(pg_get_serial_sequence('users', 'id'), 10000, true);
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        
        -- Add new columns to existing table if they don't exist
        DO $$
        BEGIN
            -- Add email_verified column
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'email_verified'
            ) THEN
                ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
                -- Mark existing users as verified to maintain backward compatibility
                UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
            END IF;
            
            -- Add verification_email column for email binding
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'verification_email'
            ) THEN
                ALTER TABLE users ADD COLUMN verification_email VARCHAR(255);
            END IF;
        END $$;
        """
        
        async with self.pool.acquire() as connection:
            await connection.execute(create_table_query)
        print("✅ Users table created/verified")
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            print("✅ Database connection pool closed")
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    async def create_user(self, name: str, email: str, password: str, is_admin: bool = False, email_verified: bool = False) -> Dict[str, Any]:
        """Create a new user"""
        password_hash = self.hash_password(password)
        created_at = datetime.now(timezone.utc)
        
        query = """
        INSERT INTO users (name, email, password_hash, is_admin, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING id, name, email, is_admin, email_verified, created_at;
        """
        
        try:
            async with self.pool.acquire() as connection:
                result = await connection.fetchrow(
                    query, name, email.lower(), password_hash, is_admin, email_verified, created_at
                )
                
                return {
                    "id": str(result['id']),
                    "name": result['name'],
                    "email": result['email'],
                    "isAdmin": result['is_admin'],
                    "emailVerified": result['email_verified'],
                    "createdAt": result['created_at']
                }
        except asyncpg.UniqueViolationError:
            raise ValueError("User with this email already exists")
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        query = """
        SELECT id, name, email, password_hash, is_admin, email_verified, verification_email, created_at
        FROM users 
        WHERE email = $1;
        """
        
        async with self.pool.acquire() as connection:
            result = await connection.fetchrow(query, email.lower())
            
            if result:
                return {
                    "id": str(result['id']),
                    "name": result['name'],
                    "email": result['email'],
                    "password_hash": result['password_hash'],
                    "isAdmin": result['is_admin'],
                    "emailVerified": result['email_verified'],
                    "verificationEmail": result['verification_email'],
                    "createdAt": result['created_at']
                }
            return None
    
    async def verify_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials"""
        user = await self.get_user_by_email(email)
        
        if user and self.verify_password(password, user['password_hash']):
            # Remove password_hash from response
            user_response = user.copy()
            user_response.pop('password_hash')
            return user_response
        
        return None
    
    async def change_password(self, email: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        user = await self.get_user_by_email(email)
        
        if not user:
            return False
        
        # Verify current password
        if not self.verify_password(current_password, user['password_hash']):
            return False
        
        # Update password
        new_password_hash = self.hash_password(new_password)
        update_query = """
        UPDATE users 
        SET password_hash = $1, updated_at = $2
        WHERE email = $3;
        """
        
        try:
            async with self.pool.acquire() as connection:
                await connection.execute(
                    update_query, new_password_hash, datetime.now(timezone.utc), email.lower()
                )
            return True
        except Exception as e:
            print(f"❌ Error changing password: {e}")
            return False

    async def verify_email(self, email: str) -> bool:
        """Mark email as verified"""
        query = """
        UPDATE users 
        SET email_verified = TRUE, updated_at = $1
        WHERE email = $2;
        """
        
        try:
            async with self.pool.acquire() as connection:
                await connection.execute(query, datetime.now(timezone.utc), email.lower())
            return True
        except Exception as e:
            print(f"❌ Error verifying email: {e}")
            return False
    
    async def update_verification_email(self, user_id: str, verification_email: str) -> bool:
        """Update verification email for email binding"""
        query = """
        UPDATE users 
        SET verification_email = $1, updated_at = $2
        WHERE id = $3;
        """
        
        try:
            async with self.pool.acquire() as connection:
                await connection.execute(query, verification_email.lower(), datetime.now(timezone.utc), user_id)
            return True
        except Exception as e:
            print(f"❌ Error updating verification email: {e}")
            return False
    
    async def confirm_email_binding(self, user_id: str) -> bool:
        """Confirm email binding by moving verification_email to email"""
        query = """
        UPDATE users 
        SET email = verification_email, 
            email_verified = TRUE,
            verification_email = NULL,
            updated_at = $1
        WHERE id = $2 AND verification_email IS NOT NULL;
        """
        
        try:
            async with self.pool.acquire() as connection:
                result = await connection.execute(query, datetime.now(timezone.utc), user_id)
                # Check if any row was updated
                return result != "UPDATE 0"
        except Exception as e:
            print(f"❌ Error confirming email binding: {e}")
            return False
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        query = """
        SELECT id, name, email, is_admin, email_verified, verification_email, created_at
        FROM users 
        WHERE id = $1;
        """
        
        async with self.pool.acquire() as connection:
            result = await connection.fetchrow(query, user_id)
            
            if result:
                return {
                    "id": str(result['id']),
                    "name": result['name'],
                    "email": result['email'],
                    "isAdmin": result['is_admin'],
                    "emailVerified": result['email_verified'],
                    "verificationEmail": result['verification_email'],
                    "createdAt": result['created_at']
                }
            return None
    
    async def reset_password_with_email(self, email: str, new_password: str) -> bool:
        """Reset password using email (for email-verified password reset)"""
        new_password_hash = self.hash_password(new_password)
        query = """
        UPDATE users 
        SET password_hash = $1, updated_at = $2
        WHERE email = $3 AND email_verified = TRUE;
        """
        
        try:
            async with self.pool.acquire() as connection:
                result = await connection.execute(query, new_password_hash, datetime.now(timezone.utc), email.lower())
                return result != "UPDATE 0"
        except Exception as e:
            print(f"❌ Error resetting password: {e}")
            return False

# Global database instance
db_manager = DatabaseManager()