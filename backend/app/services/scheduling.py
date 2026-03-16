from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Appointment,
    AppointmentStatus,
    DayAvailabilityOverride,
    ScheduleBlock,
    WeeklyAvailability,
)


def tzinfo() -> ZoneInfo:
    return ZoneInfo(settings.timezone)


def ensure_timezone(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tzinfo())
    return dt.astimezone(tzinfo())


def get_day_window(db: Session, day: date) -> tuple[datetime, datetime] | None:
    override = db.query(DayAvailabilityOverride).filter(DayAvailabilityOverride.day == day).first()
    if override:
        if not override.is_working_day:
            return None
        start_time = override.start_time or time(9, 0)
        end_time = override.end_time or time(18, 0)
        start = datetime.combine(day, start_time, tzinfo())
        end = datetime.combine(day, end_time, tzinfo())
        if start >= end:
            return None
        return start, end

    weekly = db.query(WeeklyAvailability).filter(WeeklyAvailability.weekday == day.weekday()).first()
    if not weekly or not weekly.enabled:
        return None

    start = datetime.combine(day, weekly.start_time, tzinfo())
    end = datetime.combine(day, weekly.end_time, tzinfo())
    if start >= end:
        return None
    return start, end


def has_overlap(db: Session, start_at: datetime, end_at: datetime, ignore_appointment_id: int | None = None) -> bool:
    start_at = ensure_timezone(start_at).replace(tzinfo=None)
    end_at = ensure_timezone(end_at).replace(tzinfo=None)

    appt_query = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.CANCELED,
        Appointment.start_at < end_at,
        Appointment.end_at > start_at,
    )
    if ignore_appointment_id:
        appt_query = appt_query.filter(Appointment.id != ignore_appointment_id)

    block_query = db.query(ScheduleBlock).filter(
        ScheduleBlock.start_at < end_at,
        ScheduleBlock.end_at > start_at,
    )

    return db.query(appt_query.exists()).scalar() or db.query(block_query.exists()).scalar()


def in_working_hours(db: Session, start_at: datetime, end_at: datetime) -> bool:
    start_at = ensure_timezone(start_at)
    end_at = ensure_timezone(end_at)
    if start_at.date() != end_at.date():
        return False

    day_window = get_day_window(db, start_at.date())
    if not day_window:
        return False
    day_start, day_end = day_window
    return day_start <= start_at < end_at <= day_end


def get_slots_for_range(db: Session, start_day: date, end_day: date) -> list[dict]:
    slot_delta = timedelta(minutes=settings.slot_minutes)
    out: list[dict] = []

    day = start_day
    while day <= end_day:
        override = db.query(DayAvailabilityOverride).filter(DayAvailabilityOverride.day == day).first()
        day_window = get_day_window(db, day)
        if not day_window:
            if override and not override.is_working_day:
                start = datetime.combine(day, time(0, 0), tzinfo())
                end = datetime.combine(day, time(23, 59), tzinfo())
                out.append({"start_at": start, "end_at": end, "status": "blocked"})
            day += timedelta(days=1)
            continue

        day_start, day_end = day_window
        current = day_start
        while current + slot_delta <= day_end:
            nxt = current + slot_delta
            naive_start = current.replace(tzinfo=None)
            naive_end = nxt.replace(tzinfo=None)

            occupied = db.query(Appointment).filter(
                Appointment.status != AppointmentStatus.CANCELED,
                Appointment.start_at < naive_end,
                Appointment.end_at > naive_start,
            ).first()

            blocked = db.query(ScheduleBlock).filter(
                ScheduleBlock.start_at < naive_end,
                ScheduleBlock.end_at > naive_start,
            ).first()

            status = "free"
            if blocked:
                status = "blocked"
            elif occupied:
                status = "occupied"

            out.append({"start_at": current, "end_at": nxt, "status": status})
            current = nxt

        day += timedelta(days=1)

    return out


def agenda_between(db: Session, start_at: datetime, end_at: datetime):
    start_naive = ensure_timezone(start_at).replace(tzinfo=None)
    end_naive = ensure_timezone(end_at).replace(tzinfo=None)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.start_at < end_naive,
            Appointment.end_at > start_naive,
        )
        .order_by(Appointment.start_at.asc())
        .all()
    )

    blocks = (
        db.query(ScheduleBlock)
        .filter(
            ScheduleBlock.start_at < end_naive,
            ScheduleBlock.end_at > start_naive,
        )
        .order_by(ScheduleBlock.start_at.asc())
        .all()
    )

    return appointments, blocks


def dashboard_summary(db: Session, now: datetime) -> dict:
    local_now = ensure_timezone(now)
    today_start = datetime.combine(local_now.date(), time(0, 0), tzinfo()).replace(tzinfo=None)
    today_end = today_start + timedelta(days=1)

    today_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status != AppointmentStatus.CANCELED,
        Appointment.start_at >= today_start,
        Appointment.start_at < today_end,
    ).scalar() or 0

    next_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status != AppointmentStatus.CANCELED,
        Appointment.start_at >= local_now.replace(tzinfo=None),
    ).scalar() or 0

    slots_today = get_slots_for_range(db, local_now.date(), local_now.date())
    free_slots_today = len([s for s in slots_today if s["status"] == "free"])

    return {
        "today_count": today_count,
        "next_appointments_count": next_count,
        "free_slots_today": free_slots_today,
    }
