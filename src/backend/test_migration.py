#!/usr/bin/env python3
"""
Test Migration Script for MatterAI Agent
Dry-run test of user migration to verify the process without making changes.
"""

import json
import asyncio
import sys
import os
from typing import Dict, List, Set

# Add the current directory to Python path to import database module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager

class MigrationTester:
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
            if not self.db_manager.pool:
                raise Exception("Database pool not initialized")
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
            if not self.db_manager.pool:
                raise Exception("Database pool not initialized")
            async with self.db_manager.pool.acquire() as connection:
                result = await connection.fetchrow(query)
                max_id = result['max_id']
                print(f"✅ Current maximum user ID: {max_id}")
                return max_id

        except Exception as e:
            print(f"❌ Error getting max user ID: {e}")
            raise

    def analyze_json_data(self, json_users: List[Dict]):
        """Analyze JSON data structure and content"""
        print("\n📋 JSON Data Analysis:")

        # Check data structure
        sample_user = json_users[0] if json_users else {}
        print(f"   Sample user structure: {list(sample_user.keys())}")

        # Analyze email domains
        email_domains = {}
        for user in json_users:
            email = user.get('email', '')
            if '@' in email:
                domain = email.split('@')[1].lower()
                email_domains[domain] = email_domains.get(domain, 0) + 1

        print(f"   Top email domains:")
        for domain, count in sorted(email_domains.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"     {domain}: {count} users")

        # Check admin users
        admin_count = sum(1 for user in json_users if user.get('isAdmin', False))
        print(f"   Admin users: {admin_count}")

        # Check password patterns (just count unique passwords, don't log them)
        passwords = [user.get('password', '') for user in json_users]
        unique_passwords = len(set(passwords))
        print(f"   Unique passwords: {unique_passwords} (out of {len(passwords)} users)")

    async def test_migration(self):
        """Test migration process without making changes"""
        print("🧪 Starting migration test (dry run)...")

        try:
            # Initialize database connection
            await self.db_manager.initialize()

            # Load JSON users
            json_users = await self.load_json_users()

            # Analyze JSON data
            self.analyze_json_data(json_users)

            # Get existing emails to avoid duplicates
            existing_emails = await self.get_existing_emails()

            # Get starting ID for new users
            max_id = await self.get_max_user_id()
            next_id = max_id + 1

            # Simulate migration process
            new_users = []
            skipped_users = []
            invalid_users = []

            for json_user in json_users:
                email = json_user.get('email', '').strip().lower()
                name = json_user.get('name', '').strip()

                if not email:
                    invalid_users.append(f"Empty email: {name}")
                    continue

                if not name:
                    invalid_users.append(f"Empty name: {email}")
                    continue

                if email in existing_emails:
                    skipped_users.append(email)
                    continue

                # This would be migrated
                new_users.append({
                    'id': next_id,
                    'name': name,
                    'email': email,
                    'is_admin': json_user.get('isAdmin', False)
                })
                existing_emails.add(email)  # Prevent duplicates within JSON
                next_id += 1

            print(f"\n📊 Migration Test Results:")
            print(f"   Total users in JSON: {len(json_users)}")
            print(f"   Valid users to migrate: {len(new_users)}")
            print(f"   Users skipped (existing): {len(skipped_users)}")
            print(f"   Invalid users: {len(invalid_users)}")

            if invalid_users:
                print(f"\n⚠️ Invalid users found:")
                for invalid in invalid_users[:10]:  # Show first 10
                    print(f"     {invalid}")
                if len(invalid_users) > 10:
                    print(f"     ... and {len(invalid_users) - 10} more")

            if skipped_users:
                print(f"\n⚠️ First 10 existing users that would be skipped:")
                for email in skipped_users[:10]:
                    print(f"     {email}")
                if len(skipped_users) > 10:
                    print(f"     ... and {len(skipped_users) - 10} more")

            if new_users:
                print(f"\n✅ First 5 users that would be migrated:")
                for user in new_users[:5]:
                    print(f"     ID {user['id']}: {user['name']} ({user['email']}) Admin: {user['is_admin']}")
                if len(new_users) > 5:
                    print(f"     ... and {len(new_users) - 5} more")

                print(f"\n🎯 Final ID range: {new_users[0]['id']} - {new_users[-1]['id']}")

            print(f"\n✅ Test completed successfully! No changes were made to the database.")

        except Exception as e:
            print(f"❌ Test failed: {e}")
            raise
        finally:
            await self.db_manager.close()

async def main():
    """Main entry point"""
    # Get JSON file path from command line or use default
    json_file_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/ysl/Desktop/Code/MatterAI_Agent/src/backend/auth_api/users.json"

    if not os.path.exists(json_file_path):
        print(f"❌ JSON file not found: {json_file_path}")
        print("Usage: python test_migration.py [path_to_users.json]")
        sys.exit(1)

    print(f"🎯 Testing migration for: {json_file_path}")

    tester = MigrationTester(json_file_path)
    await tester.test_migration()

if __name__ == "__main__":
    asyncio.run(main())