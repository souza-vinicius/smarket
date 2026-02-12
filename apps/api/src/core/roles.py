"""
Admin roles and permissions system.

Defines hierarchical admin roles with granular RBAC permissions.
"""

from enum import Enum
from typing import List


class AdminRole(str, Enum):
    """Administrative roles with different access levels."""

    SUPER_ADMIN = "super_admin"  # Full access to everything
    ADMIN = "admin"  # Access to most features
    SUPPORT = "support"  # Read-only + impersonation for customer support
    FINANCE = "finance"  # Reports and payments
    READ_ONLY = "read_only"  # View-only access


# Permission format: "resource:action"
# Resources: user, subscription, payment, coupon, settings, audit
# Actions: read, create, update, delete, impersonate, refund
# Wildcard: "*" means all actions for a resource

ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: ["*"],  # All permissions
    AdminRole.ADMIN: [
        "user:*",
        "subscription:*",
        "payment:read",
        "payment:refund",
        "coupon:*",
        "settings:read",
        "audit:read",
    ],
    AdminRole.SUPPORT: [
        "user:read",
        "user:impersonate",
        "subscription:read",
        "payment:read",
    ],
    AdminRole.FINANCE: [
        "user:read",
        "subscription:read",
        "payment:*",
        "coupon:read",
        "audit:read",
    ],
    AdminRole.READ_ONLY: [
        "user:read",
        "subscription:read",
        "payment:read",
        "coupon:read",
        "settings:read",
        "audit:read",
    ],
}


def has_permission(role: AdminRole, permission: str) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        role: The admin role to check
        permission: Permission string in format "resource:action"

    Returns:
        True if role has the permission, False otherwise

    Examples:
        >>> has_permission(AdminRole.SUPER_ADMIN, "user:delete")
        True
        >>> has_permission(AdminRole.SUPPORT, "user:delete")
        False
        >>> has_permission(AdminRole.SUPPORT, "user:impersonate")
        True
    """
    permissions = ROLE_PERMISSIONS.get(role, [])

    # Super admin wildcard
    if "*" in permissions:
        return True

    # Exact match
    if permission in permissions:
        return True

    # Resource wildcard (e.g., "user:*" matches "user:read")
    resource, action = permission.split(":", 1)
    resource_wildcard = f"{resource}:*"
    if resource_wildcard in permissions:
        return True

    return False


def get_role_permissions(role: AdminRole) -> List[str]:
    """
    Get all permissions for a specific role.

    Args:
        role: The admin role

    Returns:
        List of permission strings
    """
    return ROLE_PERMISSIONS.get(role, [])
