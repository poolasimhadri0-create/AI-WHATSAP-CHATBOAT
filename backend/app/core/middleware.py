import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP middleware logging incoming requests, duration, status code, and errors.
    """

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        url = request.url.path

        logger.info(f"Incoming request: {method} {url} from {client_ip}")

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                f"Completed request: {method} {url} -> Status {response.status_code} in {duration_ms:.2f}ms"
            )
            response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Request failed: {method} {url} in {duration_ms:.2f}ms - Error: {exc}")
            raise
