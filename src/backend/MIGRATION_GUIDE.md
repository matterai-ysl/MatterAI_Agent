# User Migration Guide

This guide explains how to migrate users from the JSON file to the cloud PostgreSQL database.

## Overview

The migration process will:
- Read users from `auth_api/users.json`
- Check for existing users in the cloud database (by email)
- **Prioritize cloud database users** - existing users will NOT be overwritten
- Add new users with sequential IDs starting from the current maximum ID
- Hash all passwords using bcrypt for security
- Mark migrated users as email-verified

## Migration Results Preview

Based on the test run:
- **Total users in JSON**: 663
- **Valid users to migrate**: 660
- **Users skipped (existing)**: 3
- **Invalid users**: 0

### Existing users that will be skipped (preserved):
- admin@example.com
- yusonglin22@mails.ucas.ac.cn
- ywwang@mail.sic.ac.cn

### New users will get IDs: 10007 - 10666

## How to Run Migration

### Step 1: Test Migration (Recommended)
First, run a dry-run test to verify what will happen:

```bash
cd /Users/ysl/Desktop/Code/MatterAI_Agent/src/backend
python test_migration.py
```

### Step 2: Run Actual Migration
Once you're satisfied with the test results:

```bash
cd /Users/ysl/Desktop/Code/MatterAI_Agent/src/backend
python migrate_users.py
```

The script will ask for confirmation before proceeding:
```
⚠️ This will migrate users to the cloud database. Continue? (y/N):
```

Type `y` and press Enter to proceed.

## What Happens During Migration

1. **Database Connection**: Connects to your cloud PostgreSQL database
2. **Duplicate Check**: Compares emails to avoid duplicates
3. **Password Security**: All passwords are hashed using bcrypt
4. **Sequential IDs**: Assigns new sequential IDs starting from max existing ID + 1
5. **Batch Processing**: Inserts users in batches of 100 for efficiency
6. **Sequence Update**: Updates the PostgreSQL sequence for future auto-increment IDs

## Safety Features

- **No Overwrites**: Existing cloud users are never modified
- **Email Normalization**: All emails are converted to lowercase for comparison
- **Error Handling**: Individual user insertion errors won't stop the entire process
- **Transaction Safety**: Each batch is processed safely
- **Confirmation Required**: Manual confirmation before any changes

## After Migration

- All migrated users will be marked as `email_verified = true`
- Passwords will be securely hashed (original plaintext passwords are discarded)
- Users can log in with their original credentials
- IDs will be sequential integers starting from 10007

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your environment variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - Ensure the database is accessible from your current network

2. **Duplicate Email Error**
   - This is expected and safe - the script skips existing users
   - Check the console output to see which users were skipped

3. **Permission Error**
   - Ensure the database user has INSERT permissions on the `users` table

### Recovery

If something goes wrong:
- The migration uses the existing table structure
- You can safely delete migrated users by ID range if needed:
  ```sql
  DELETE FROM users WHERE id >= 10007 AND id <= 10666;
  ```
- Re-run the migration script after fixing any issues

## File Structure

- `migrate_users.py` - Main migration script
- `test_migration.py` - Dry-run test script
- `database.py` - Database connection and user management
- `auth_api/users.json` - Source user data

## Security Notes

- Original JSON passwords are in plaintext - ensure this file is secured
- After migration, passwords are properly hashed in the database
- Consider deleting or securing the JSON file after successful migration