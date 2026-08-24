from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse


@dataclass
class ApiError(Exception):
    code: str
    message: str
    status_code: int


async def api_error_handler(_: Request, error: ApiError) -> JSONResponse:
    return JSONResponse(
        {"error": {"code": error.code, "message": error.message}},
        status_code=error.status_code,
        headers={"Cache-Control": "no-store"},
    )
