"""
FastAPI application factory.

Module 2 deliverable: app boots, connects to Postgres, exposes
GET /health, and mounts the (currently stub) v1 API router so every
later module only has to fill in its own router file.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import BaseAppException
from app.core.logging import configure_logging, get_logger
from app.db.session import engine
from app.models.base import Base
import app.models  # noqa: F401

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("app.startup", app_name=settings.app_name, env=settings.app_env)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("db.init_warning", error=str(e))
    yield
    logger.info("app.shutdown")



def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.app_env == "development" else [],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", "Content-Length", "Content-Type"],
    )

    @app.exception_handler(BaseAppException)
    async def app_exception_handler(request: Request, exc: BaseAppException):
        logger.error(
            "request.failed",
            error_code=exc.error_code,
            message=exc.message,
            path=str(request.url.path),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error_code": exc.error_code, "message": exc.message, "details": exc.details},
        )

    # Health check is exposed at /health (not under /api/v1) for simple
    # docker-compose / load-balancer healthchecks.
    from app.api.v1 import health

    app.include_router(health.router)
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
