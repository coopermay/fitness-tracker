from fastapi import APIRouter, FastAPI

from app.routers import gyms, lifts, machines, muscle_groups, sets, settings

app = FastAPI(title="Lift Tracker API")

# Every endpoint lives under /api so the frontend can proxy a single prefix.
api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(gyms.router)
api.include_router(muscle_groups.router)
api.include_router(lifts.router)
api.include_router(machines.router)
api.include_router(sets.router)
api.include_router(settings.router)

app.include_router(api)
