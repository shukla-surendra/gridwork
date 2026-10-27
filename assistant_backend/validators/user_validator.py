import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, constr, validator
import phonenumbers
from constants import UserStatus, UserRoles, UserType
from utils.passwords import validate_password_strength

class UserValidator(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=100)
    first_name: constr(min_length=1, max_length=50)
    last_name: Optional[constr(max_length=50)] = None
    country_code: Optional[str] = None
    mobile_number: Optional[str] = None
    google_id: Optional[str] = None
    status: UserStatus = UserStatus.ACTIVE
    role: UserRoles = UserRoles.USER
    user_type: UserType = UserType.FREE
    preferences: dict = {}
    is_deleted: bool = False
    is_email_verified: bool = False
    is_phone_verified: bool = False
    verification_token: Optional[str] = None
    otp: Optional[str] = None
    otp_time: Optional[datetime] = None

    @validator('password')
    def validate_password(cls, v):
        return validate_password_strength(v)

    @validator('mobile_number')
    def validate_mobile_number(cls, v, values):
        if v and 'country_code' in values and values['country_code']:
            try:
                phone_number = f"{values['country_code']}{v}"
                parsed_number = phonenumbers.parse(phone_number)
                if not phonenumbers.is_valid_number(parsed_number):
                    raise ValueError('Invalid phone number')
                return v
            except Exception as e:
                raise ValueError('Invalid phone number format')
        return v

    @validator('first_name', 'last_name')
    def validate_name(cls, v):
        if v and not v.replace(' ', '').isalpha():
            raise ValueError('Name should contain only letters and spaces')
        return v

    @validator('preferences')
    def validate_preferences(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Preferences must be a dictionary')
        return v
