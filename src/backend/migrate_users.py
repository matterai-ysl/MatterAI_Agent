#!/usr/bin/env python3
"""
User Migration Script for MatterAI Agent
Migrates users from JSON file to PostgreSQL database.
- Preserves cloud database users (priority)
- Adds new users from JSON with proper password hashing
- Assigns sequential IDs starting from current max ID
"""

import json
import asyncio
import sys
import os
from datetime import datetime, timezone
from typing import Dict, List, Set

# Add the current directory to Python path to import database module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager

class UserMigrator:
    def __init__(self, json_file_path: str):
        self.json_file_path = json_file_path
        self.db_manager = DatabaseManager()

    async def load_json_users(self) -> List[Dict]:
        """Load users from JSON file"""
        print(f"📂 Loading users from {self.json_file_path}")

        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            users = data.get('users', [])
            print(f"✅ Found {len(users)} users in JSON file")
            return users

        except Exception as e:
            print(f"❌ Error loading JSON file: {e}")
            raise

    async def get_existing_emails(self) -> Set[str]:
        """Get all existing email addresses from database"""
        print("🔍 Checking existing emails in database...")

        query = "SELECT LOWER(email) FROM users"

        try:
            async with self.db_manager.pool.acquire() as connection:
                rows = await connection.fetch(query)
                existing_emails = {row['lower'] for row in rows}
                print(f"✅ Found {len(existing_emails)} existing emails in database")
                return existing_emails

        except Exception as e:
            print(f"❌ Error fetching existing emails: {e}")
            raise

    async def get_max_user_id(self) -> int:
        """Get the current maximum user ID from database"""
        print("🔢 Getting current maximum user ID...")

        query = "SELECT COALESCE(MAX(id), 10000) as max_id FROM users"

        try:
            async with self.db_manager.pool.acquire() as connection:
                result = await connection.fetchrow(query)
                max_id = result['max_id']
                print(f"✅ Current maximum user ID: {max_id}")
                return max_id

        except Exception as e:
            print(f"❌ Error getting max user ID: {e}")
            raise

    def convert_json_user_to_db_format(self, json_user: Dict, new_id: int) -> Dict:
        """Convert JSON user format to database format"""
        # Parse creation date
        created_at_str = json_user.get('createdAt', '2023-01-01T00:00:00.000Z')
        try:
            if created_at_str.endswith('Z'):
                created_at_str = created_at_str[:-1] + '+00:00'
            created_at = datetime.fromisoformat(created_at_str)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
        except:
            created_at = datetime.now(timezone.utc)

        return {
            'id': new_id,
            'name': json_user.get('name', '').strip(),
            'email': json_user.get('email', '').strip().lower(),
            'password': json_user.get('password', ''),  # Will be hashed during insertion
            'is_admin': json_user.get('isAdmin', False),
            'email_verified': True,  # Mark migrated users as verified
            'created_at': created_at,
            'updated_at': created_at
        }

    async def insert_user_batch(self, users_batch: List[Dict]) -> int:
        """Insert a batch of users into database"""
        if not users_batch:
            return 0

        insert_query = """
        INSERT INTO users (id, name, email, password_hash, is_admin, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """

        inserted_count = 0

        try:
            async with self.db_manager.pool.acquire() as connection:
                for user in users_batch:
                    try:
                        # Hash the password
                        password_hash = self.db_manager.hash_password(user['password'])

                        await connection.execute(
                            insert_query,
                            user['id'],
                            user['name'],
                            user['email'],
                            password_hash,
                            user['is_admin'],
                            user['email_verified'],
                            user['created_at'],
                            user['updated_at']
                        )
                        inserted_count += 1

                    except Exception as e:
                        print(f"⚠️ Failed to insert user {user['email']}: {e}")
                        continue

        except Exception as e:
            print(f"❌ Error in batch insert: {e}")
            raise

        return inserted_count

    async def update_sequence(self, final_id: int):
        """Update the users ID sequence to the final ID"""
        print(f"🔄 Updating users ID sequence to {final_id}")

        query = "SELECT setval(pg_get_serial_sequence('users', 'id'), $1, true)"

        try:
            async with self.db_manager.pool.acquire() as connection:
                await connection.execute(query, final_id)
            print("✅ Users ID sequence updated successfully")

        except Exception as e:
            print(f"❌ Error updating sequence: {e}")
            raise

    async def migrate(self):
        """Main migration process"""
        print("🚀 Starting user migration process...")

        try:
            # Initialize database connection
            await self.db_manager.initialize()

            # Load JSON users
            json_users = await self.load_json_users()

            # Get existing emails to avoid duplicates
            existing_emails = await self.get_existing_emails()

            # Get starting ID for new users
            max_id = await self.get_max_user_id()
            next_id = max_id + 1

            # Filter out users that already exist (prioritize cloud database)
            new_users = []
            skipped_count = 0

            for json_user in json_users:
                email = json_user.get('email', '').strip().lower()

                if not email:
                    print(f"⚠️ Skipping user with empty email: {json_user.get('name', 'Unknown')}")
                    skipped_count += 1
                    continue

                if email in existing_emails:
                    print(f"⚠️ Skipping existing user: {email}")
                    skipped_count += 1
                    continue

                # Convert to database format with new sequential ID
                db_user = self.convert_json_user_to_db_format(json_user, next_id)
                new_users.append(db_user)
                existing_emails.add(email)  # Prevent duplicates within JSON
                next_id += 1

            print(f"📊 Migration Summary:")
            print(f"   Total users in JSON: {len(json_users)}")
            print(f"   Users to migrate: {len(new_users)}")
            print(f"   Users skipped (duplicates/invalid): {skipped_count}")

            if not new_users:
                print("✅ No new users to migrate")
                return

            # Insert users in batches
            batch_size = 100
            total_inserted = 0

            for i in range(0, len(new_users), batch_size):
                batch = new_users[i:i + batch_size]
                inserted = await self.insert_user_batch(batch)
                total_inserted += inserted
                print(f"📝 Inserted batch {i//batch_size + 1}: {inserted}/{len(batch)} users")

            # Update the sequence to the final ID
            if new_users:
                final_id = new_users[-1]['id']
                await self.update_sequence(final_id)

            print(f"✅ Migration completed successfully!")
            print(f"   Total users inserted: {total_inserted}")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise
        finally:
            await self.db_manager.close()

async def main():
    """Main entry point"""
    # Get JSON file path from command line or use default
    json_file_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/ysl/Desktop/Code/MatterAI_Agent/src/backend/auth_api/users.json"

    if not os.path.exists(json_file_path):
        print(f"❌ JSON file not found: {json_file_path}")
        print("Usage: python migrate_users.py [path_to_users.json]")
        sys.exit(1)

    print(f"🎯 Migration target: {json_file_path}")

    # Confirm migration
    response = input("⚠️ This will migrate users to the cloud database. Continue? (y/N): ")
    if response.lower() != 'y':
        print("❌ Migration cancelled")
        sys.exit(0)

    migrator = UserMigrator(json_file_path)
    await migrator.migrate()

if __name__ == "__main__":
    asyncio.run(main())