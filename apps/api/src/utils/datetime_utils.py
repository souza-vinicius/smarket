"""Datetime utilities for safe naive-datetime handling.

This project uses datetime.utcnow() (naive) everywhere, but some DB columns
were created with DateTime(timezone=True), so AsyncPG returns timezone-aware
datetimes. These helpers ensure safe comparisons and consistent naive values.
"""

from datetime import datetime


def utcnow() -> datetime:
    """Return current UTC time as a naive datetime."""
    return datetime.utcnow()


def ensure_naive(dt: datetime) -> datetime:
    """Strip timezone info from a datetime, returning a naive datetime.

    Use this when reading datetimes from the database that may come back
    as timezone-aware (from TIMESTAMP WITH TIME ZONE columns via AsyncPG).
    """
    if dt is None:
        return dt
    return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
