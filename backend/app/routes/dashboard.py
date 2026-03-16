from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_doctor
from app.models import Appointment, Doctor, Patient
from app.schemas import AppointmentOut, DashboardSummary
from app.services.scheduling import dashboard_summary, tzinfo

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    return dashboard_summary(db, datetime.now(tzinfo()))


@router.get("/day", response_model=list[AppointmentOut])
def appointments_day(
    day: date,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    start = datetime.combine(day, time(0, 0))
    end = start + timedelta(days=1)
    return (
        db.query(Appointment)
        .join(Patient)
        .filter(Appointment.start_at >= start, Appointment.start_at < end)
        .order_by(Appointment.start_at.asc())
        .all()
    )


@router.get("/week", response_model=list[AppointmentOut])
def appointments_week(
    day: date,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    start = datetime.combine(day - timedelta(days=day.weekday()), time(0, 0))
    end = start + timedelta(days=7)
    return (
        db.query(Appointment)
        .join(Patient)
        .filter(Appointment.start_at >= start, Appointment.start_at < end)
        .order_by(Appointment.start_at.asc())
        .all()
    )


@router.get("/month", response_model=list[AppointmentOut])
def appointments_month(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    start = datetime(year=year, month=month, day=1)
    if month == 12:
        end = datetime(year=year + 1, month=1, day=1)
    else:
        end = datetime(year=year, month=month + 1, day=1)

    return (
        db.query(Appointment)
        .join(Patient)
        .filter(Appointment.start_at >= start, Appointment.start_at < end)
        .order_by(Appointment.start_at.asc())
        .all()
    )


@router.get("/search", response_model=list[AppointmentOut])
def search_appointments(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    like = f"%{q}%"
    return (
        db.query(Appointment)
        .join(Patient)
        .filter(
            or_(
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
                Patient.phone.ilike(like),
            )
        )
        .order_by(Appointment.start_at.desc())
        .limit(50)
        .all()
    )
