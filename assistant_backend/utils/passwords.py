import re


def validate_password_strength(v: str) -> str:
    """Shared by signup and change-password so the two can't drift."""
    if len(v) < 8 or len(v) > 100:
        raise ValueError('Password must be between 8 and 100 characters')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'\d', v):
        raise ValueError('Password must contain at least one number')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
        raise ValueError('Password must contain at least one special character')
    return v
