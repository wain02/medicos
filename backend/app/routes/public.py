from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Appointment, AppointmentStatus, Doctor, Patient
from app.schemas import PublicAvailabilityResponse, PublicBookAppointmentRequest, PublicBookAppointmentResponse
from app.services.scheduling import ensure_timezone, get_slots_for_range, has_overlap, in_working_hours

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/availability", response_model=PublicAvailabilityResponse)
def public_availability(
    start_date: date = Query(..., description="YYYY-MM-DD"),
    end_date: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    slots = get_slots_for_range(db, start_date, end_date)
    return PublicAvailabilityResponse(timezone=settings.timezone, slots=slots)


@router.post("/book", response_model=PublicBookAppointmentResponse, status_code=status.HTTP_201_CREATED)
def public_book_appointment(
    payload: PublicBookAppointmentRequest,
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.is_active.is_(True)).first()
    if not doctor:
        raise HTTPException(status_code=503, detail="No hay médico disponible")

    start_at = ensure_timezone(payload.start_at)
    end_at = start_at + timedelta(minutes=settings.slot_minutes)

    if not in_working_hours(db, start_at, end_at):
        raise HTTPException(status_code=400, detail="El horario no está dentro de la agenda laboral")
    if has_overlap(db, start_at, end_at):
        raise HTTPException(status_code=409, detail="El horario ya no está disponible")

    patient = db.query(Patient).filter(Patient.phone == payload.phone).first()
    if not patient:
        patient = Patient(
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            email=payload.email,
        )
        db.add(patient)
        db.flush()
    else:
        patient.first_name = payload.first_name
        patient.last_name = payload.last_name
        patient.email = payload.email

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        reason=payload.reason,
        internal_notes=None,
        start_at=start_at.replace(tzinfo=None),
        end_at=end_at.replace(tzinfo=None),
        status=AppointmentStatus.PENDING,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return PublicBookAppointmentResponse(
        id=appointment.id,
        status=appointment.status,
        start_at=appointment.start_at,
        end_at=appointment.end_at,
        message="Turno reservado correctamente",
    )
