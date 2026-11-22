"""FastAPI entry point. Run with:  uvicorn main:app --reload --port 8000"""
import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import dashboard, followups, leads

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
# The HTTP client logs full request URLs at INFO level; keep it quiet.
for _name in ("httpx", "httpx2", "httpcore", "google_genai"):
    logging.getLogger(_name).setLevel(logging.WARNING)

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Return readable validation messages (without echoing submitted values back)."""
    errors = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
        errors.append({"field": field, "message": err.get("msg", "Invalid value")})
    summary = "; ".join(f"{e['field']}: {e['message']}" for e in errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": f"Validation failed - {summary}", "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logging.getLogger("app").exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(leads.router)
app.include_router(followups.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "ai_configured": settings.ai_configured, "model": settings.gemini_model}
