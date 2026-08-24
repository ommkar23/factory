from fastapi import APIRouter

router = APIRouter(tags=["operations"])


@router.get(
    "/health",
    summary="Service health",
    description="Liveness endpoint for load balancers and container health checks.",
)
def get_health() -> dict[str, str]:
    return {"status": "ok"}
