from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_doctor
from app.models import Appointment, AppointmentStatus, Doctor, Patient
from app.schemas import AgendaResponse, AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.scheduling import agenda_between, ensure_timezone, has_overlap, in_working_hours

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _find_or_create_patient(db: Session, first_name: str, last_name: str, phone: str, email: str | None):
    patient = db.query(Patient).filter(Patient.phone == phone).first()
    if patient:
        patient.first_name = first_name
        patient.last_name = last_name
        patient.email = email
        return patient

    patient = Patient(first_name=first_name, last_name=last_name, phone=phone, email=email)
    db.add(patient)
    db.flush()
    return patient


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    start_at = datetime.combine(start_date, time(0, 0))
    end_at = datetime.combine(end_date + timedelta(days=1), time(0, 0))

    appointments = (
        db.query(Appointment)
        .join(Patient)
        .filter(Appointment.start_at >= start_at, Appointment.start_at < end_at)
        .order_by(Appointment.start_at.asc())
        .all()
    )
    return appointments


@router.get("/agenda", response_model=AgendaResponse)
def agenda(
    start_at: datetime,
    end_at: datetime,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    appointments, blocks = agenda_between(db, start_at, end_at)
    return AgendaResponse(timezone=settings.timezone, appointments=appointments, blocks=blocks)


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="Rango de horario inválido")
    if not in_working_hours(db, payload.start_at, payload.end_at):
        raise HTTPException(status_code=400, detail="El turno está fuera del horario laboral")
    if has_overlap(db, payload.start_at, payload.end_at):
        raise HTTPException(status_code=409, detail="El turno se solapa con otro turno o bloqueo")

    patient = _find_or_create_patient(
        db,
        payload.patient.first_name,
        payload.patient.last_name,
        payload.patient.phone,
        payload.patient.email,
    )

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        reason=payload.reason,
        internal_notes=payload.internal_notes,
        start_at=ensure_timezone(payload.start_at).replace(tzinfo=None),
        end_at=ensure_timezone(payload.end_at).replace(tzinfo=None),
        status=payload.status,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    start_at = payload.start_at or appointment.start_at
    end_at = payload.end_at or appointment.end_at
    if end_at <= start_at:
        raise HTTPException(status_code=400, detail="Rango de horario inválido")
    if not in_working_hours(db, start_at, end_at):
        raise HTTPException(status_code=400, detail="El turno está fuera del horario laboral")
    if has_overlap(db, start_at, end_at, ignore_appointment_id=appointment.id):
        raise HTTPException(status_code=409, detail="El turno se solapa con otro turno o bloqueo")

    appointment.start_at = ensure_timezone(start_at).replace(tzinfo=None)
    appointment.end_at = ensure_timezone(end_at).replace(tzinfo=None)
    if payload.reason is not None:
        appointment.reason = payload.reason
    if payload.internal_notes is not None:
        appointment.internal_notes = payload.internal_notes
    if payload.status is not None:
        appointment.status = payload.status

    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: Doctor = Depends(get_current_doctor),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    appointment.status = AppointmentStatus.CANCELED
    db.commit()
    return {"ok": True, "message": "Turno cancelado"}
