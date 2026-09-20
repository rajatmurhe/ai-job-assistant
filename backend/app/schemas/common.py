"""
Shared response schemas: pagination envelope and error response.

Implemented now (Module 2) since api/v1/health.py and every future
router depend on a consistent error shape.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: dict = {}


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
