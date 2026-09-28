from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class ChatbotBaseException(HTTPException):
    """Base exception for domain-level application errors."""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "ERROR",
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class EntityNotFoundException(ChatbotBaseException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with identifier '{identifier}' was not found.",
            error_code="NOT_FOUND"
        )


class EntityAlreadyExistsException(ChatbotBaseException):
    def __init__(self, entity_name: str, field: str, value: Any):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{entity_name} with {field} '{value}' already exists.",
            error_code="ALREADY_EXISTS"
        )


class InvalidCredentialsException(ChatbotBaseException):
    def __init__(self, detail: str = "Invalid email or password."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="INVALID_CREDENTIALS",
            headers={"WWW-Authenticate": "Bearer"}
        )


class TokenExpiredOrInvalidException(ChatbotBaseException):
    def __init__(self, detail: str = "Token has expired or is invalid."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="INVALID_TOKEN",
            headers={"WWW-Authenticate": "Bearer"}
        )


class InactiveUserException(ChatbotBaseException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
            error_code="INACTIVE_USER"
        )


class UnauthorizedAccessException(ChatbotBaseException):
    def __init__(self, detail: str = "You do not have permission to access this resource."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN"
        )


class LLMServiceException(ChatbotBaseException):
    def __init__(self, detail: str = "AI service encountered an error processing your request."):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            error_code="LLM_ERROR"
        )


class PromptInjectionException(ChatbotBaseException):
    def __init__(self, detail: str = "Potentially harmful input detected in prompt."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="SECURITY_VIOLATION"
        )
