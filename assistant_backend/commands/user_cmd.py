from pydantic import BaseModel
from typing import Optional


class UserCommand(BaseModel):
    first_name: str
    last_name: Optional[str]
    email: str
    password: str

class UserDeleteCommand(BaseModel):
    user_id: Optional[str]

class UserUpdateCommand(BaseModel):
    user_id: Optional[str] = None  # Set from the URL path by the controller
    # `Optional[str]` alone does NOT make a Pydantic field optional -- it
    # still has to be present in the request body unless it also has a
    # `= None` default. Without these defaults, every partial profile
    # update (e.g. just first_name) was rejected with a 422 demanding
    # last_name and password too.
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    # No password here -- changing it goes through ChangePasswordCommand,
    # which requires the current password.


class ChangePasswordCommand(BaseModel):
    current_password: str
    new_password: str

class LoginCommand(BaseModel):
    email: str
    password: str


class OtpLoginCommand(BaseModel):
    email: str
    otp: int


class OtpRequestLoginCommand(BaseModel):
    email: str
    verification_otp_token: str

class TokenCreateRequest(BaseModel):
    email: str

class EmailVerificationRequest(BaseModel):
    verification_otp_token: str
    email: str
