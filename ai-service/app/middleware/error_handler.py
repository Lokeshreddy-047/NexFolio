import logging
from fastapi import Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger("nexfolio.api")


def register_exception_handlers(app):
    """
    Registers standardized JSON exception handlers across FastAPI application.
    """

    async def _handle_http_exc(request: Request, exc: HTTPException | StarletteHTTPException):
        req_id = getattr(request.state, "request_id", "req-unknown")
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "RATE_LIMIT_EXCEEDED"
        }
        err_code = code_map.get(exc.status_code, "HTTP_ERROR")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": err_code,
                    "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                    "request_id": req_id
                }
            },
            headers=getattr(exc, "headers", None)
        )

    @app.exception_handler(HTTPException)
    async def fastapi_http_exception_handler(request: Request, exc: HTTPException):
        return await _handle_http_exc(request, exc)

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
        return await _handle_http_exc(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", "req-unknown")
        details = []
        for error in exc.errors():
            loc = " -> ".join(str(l) for l in error.get("loc", []))
            details.append({
                "field": loc,
                "issue": error.get("msg", "Validation error"),
                "type": error.get("type", "value_error")
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed. Please check the request payload.",
                    "request_id": req_id,
                    "details": details
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", "req-unknown")
        logger.error(f"[Unhandled Exception] [{req_id}] {exc}", exc_info=True)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred. Please contact NexFolio support with the request ID.",
                    "request_id": req_id
                }
            }
        )
