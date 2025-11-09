import re
from django.core.exceptions import ValidationError

PHONE_RE = re.compile(r'^\+\d{6,15}$')  # + followed by 6..15 digits, no spaces

def validate_international_phone_no_spaces(value):
    """
    Accepts formats like +441234567890
    No spaces allowed. Minimum/maximum digits are adjustable.
    """
    if not isinstance(value, str):
        raise ValidationError("Phone number must be a string.")
    if not PHONE_RE.match(value):
        raise ValidationError("Enter phone as +<country><number> with no spaces (e.g. +441234567890).")