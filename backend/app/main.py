from fastapi import APIRouter, FastAPI

app = FastAPI(title="Lift Tracker API")

# Every endpoint lives under /api so the frontend can proxy a single prefix.
api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)
