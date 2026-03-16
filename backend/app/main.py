from datetime import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Doctor, WeeklyAvailability
from app.routes.appointments import router as appointments_router
from app.routes.auth import router as auth_router
from app.routes.blocks import router as availability_router
from app.routes.dashboard import router as dashboard_router
from app.routes.public import router as public_router
from app.security import get_password_hash


def _seed_defaults() -> None:
    db = SessionLocal()
    try:
        doctor = db.query(Doctor).filter(Doctor.username == settings.admin_username).first()
        if not doctor:
            db.add(
                Doctor(
                    username=settings.admin_username,
                    full_name=settings.admin_full_name,
                    hashed_password=get_password_hash(settings.admin_password),
                    is_active=True,
                )
            )

        for weekday in range(7):
            row = db.query(WeeklyAvailability).filter(WeeklyAvailability.weekday == weekday).first()
            if row:
                continue
            db.add(
                WeeklyAvailability(
                    weekday=weekday,
                    enabled=weekday < 5,
                    start_time=time(9, 0),
                    end_time=time(18, 0),
                )
            )
        db.commit()
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
_seed_defaults()

app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(public_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(availability_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}
