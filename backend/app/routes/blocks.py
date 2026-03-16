from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_doctor
from app.models import DayAvailabilityOverride, Doctor, ScheduleBlock, WeeklyAvailability
from app.schemas import (
    DayOverrideCreate,
    DayOverrideOut,
    ScheduleBlockCreate,
    ScheduleBlockOut,
    WeeklyAvailabilityBulkUpdate,
    WeeklyAvailabilityItem,
)
from app.services.scheduling import has_overlap

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("/blocks", response_model=ScheduleBlockOut)
def create_block(
    payload: ScheduleBlockCreate,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="Rango inválido")
    if has_overlap(db, payload.start_at, payload.end_at):
        raise HTTPException(status_code=409, detail="Se solapa con un turno o bloqueo existente")

    block = ScheduleBlock(
        start_at=payload.start_at.replace(tzinfo=None),
        end_at=payload.end_at.replace(tzinfo=None),
        reason=payload.reason,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.delete("/blocks/{block_id}")
def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    block = db.query(ScheduleBlock).filter(ScheduleBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    db.delete(block)
    db.commit()
    return {"ok": True, "message": "Bloqueo eliminado"}


@router.get("/weekly", response_model=list[WeeklyAvailabilityItem])
def get_weekly_availability(
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    items = db.query(WeeklyAvailability).order_by(WeeklyAvailability.weekday.asc()).all()
    return items


@router.put("/weekly", response_model=list[WeeklyAvailabilityItem])
def update_weekly_availability(
    payload: WeeklyAvailabilityBulkUpdate,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    by_weekday = {item.weekday: item for item in payload.items}
    for weekday in range(7):
        item = by_weekday.get(weekday)
        if not item:
            continue

        row = db.query(WeeklyAvailability).filter(WeeklyAvailability.weekday == weekday).first()
        if not row:
            row = WeeklyAvailability(
                weekday=weekday,
                enabled=item.enabled,
                start_time=item.start_time,
                end_time=item.end_time,
            )
            db.add(row)
        else:
            row.enabled = item.enabled
            row.start_time = item.start_time
            row.end_time = item.end_time

    db.commit()
    items = db.query(WeeklyAvailability).order_by(WeeklyAvailability.weekday.asc()).all()
    return items


@router.post("/overrides", response_model=DayOverrideOut)
def create_or_update_day_override(
    payload: DayOverrideCreate,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    row = db.query(DayAvailabilityOverride).filter(DayAvailabilityOverride.day == payload.day).first()
    if not row:
        row = DayAvailabilityOverride(day=payload.day)
        db.add(row)

    row.is_working_day = payload.is_working_day
    row.start_time = payload.start_time
    row.end_time = payload.end_time

    if row.is_working_day and (not row.start_time or not row.end_time):
        row.start_time = time(9, 0)
        row.end_time = time(18, 0)

    db.commit()
    db.refresh(row)
    return row


@router.get("/overrides", response_model=list[DayOverrideOut])
def list_day_overrides(
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    return db.query(DayAvailabilityOverride).order_by(DayAvailabilityOverride.day.asc()).all()


@router.delete("/overrides/{day}")
def delete_day_override(
    day: date,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    row = db.query(DayAvailabilityOverride).filter(DayAvailabilityOverride.day == day).first()
    if not row:
        raise HTTPException(status_code=404, detail="Excepción no encontrada")

    db.delete(row)
    db.commit()
    return {"ok": True}
