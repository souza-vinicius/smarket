"""
Create trial subscriptions for existing users.

This script creates 30-day trial subscriptions for all users who don't have one yet.
Run this after enabling ENABLE_SUBSCRIPTION_SYSTEM=true for the first time.

Usage:
    python scripts/create_trial_subscriptions.py
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import AsyncSessionLocal
from src.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus
from src.models.user import User


async def create_trial_subscriptions():
    """Create trial subscriptions for users who don't have one."""
    async with AsyncSessionLocal() as db:
        # Get all users
        result = await db.execute(select(User))
        users = result.scalars().all()

        print(f"Found {len(users)} users")

        # Get existing subscriptions
        result = await db.execute(select(Subscription))
        existing_subs = {sub.user_id for sub in result.scalars().all()}

        print(f"Found {len(existing_subs)} existing subscriptions")

        # Create subscriptions for users who don't have one
        created_count = 0
        for user in users:
            if user.id not in existing_subs:
                trial_start = datetime.now(timezone.utc)
                trial_end = trial_start + timedelta(days=settings.TRIAL_DURATION_DAYS)

                subscription = Subscription(
                    user_id=user.id,
                    plan=SubscriptionPlan.FREE.value,
                    status=SubscriptionStatus.TRIAL.value,
                    trial_start=trial_start,
                    trial_end=trial_end,
                )
                db.add(subscription)
                created_count += 1
                print(
                    f"✅ Created trial for user {user.email} (expires: {trial_end.strftime('%Y-%m-%d')})"
                )

        if created_count > 0:
            await db.commit()
            print(f"\n✅ Successfully created {created_count} trial subscriptions")
        else:
            print("\n✅ All users already have subscriptions")


async def main():
    """Main entry point."""
    print("=" * 60)
    print("Creating trial subscriptions for existing users")
    print("=" * 60)
    print()

    if not settings.subscription_enabled:
        print("⚠️  WARNING: ENABLE_SUBSCRIPTION_SYSTEM is false")
        print("   Set it to true in .env and restart the API")
        return

    try:
        await create_trial_subscriptions()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
