"""
Custom exception hierarchy.

Golden Rule 9: fail loudly. Every error that reaches the API boundary
is one of these, mapped to a proper HTTP status code and a structured
error response — never a silently-swallowed empty result.
"""


class BaseAppException(Exception):
    """Base class for all application exceptions."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ValidationFailedError(BaseAppException):
    """Raised when input or LLM-output schema validation fails after retries."""

    status_code = 422
    error_code = "VALIDATION_FAILED"


class NotFoundError(BaseAppException):
    status_code = 404
    error_code = "NOT_FOUND"


class FileTooLargeError(BaseAppException):
    status_code = 413
    error_code = "FILE_TOO_LARGE"


class UnsupportedFileTypeError(BaseAppException):
    status_code = 415
    error_code = "UNSUPPORTED_FILE_TYPE"


class LLMProviderError(BaseAppException):
    """All retries against an LLM provider were exhausted."""

    status_code = 502
    error_code = "LLM_PROVIDER_ERROR"


class TruthfulnessViolationError(BaseAppException):
    """
    Raised when generated content contains a skill, employer, metric, or
    claim that does not exist in the source resume. Golden Rule 1: NEVER
    FABRICATE. This exception must never be caught-and-ignored.
    """

    status_code = 422
    error_code = "TRUTHFULNESS_VIOLATION"


class InvalidStatusTransitionError(BaseAppException):
    """Raised when an application FSM transition is not allowed (section 17)."""

    status_code = 409
    error_code = "INVALID_STATUS_TRANSITION"


class ConfigurationError(BaseAppException):
    status_code = 500
    error_code = "CONFIGURATION_ERROR"
