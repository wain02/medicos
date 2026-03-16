from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models import Appointment, AppointmentStatus, Doctor, Patient


def run_seed():
    db = SessionLocal()
    try:
        doctor = db.query(Doctor).first()
        if not doctor:
            return

        patient = db.query(Patient).filter(Patient.phone == "111111111").first()
        if not patient:
            patient = Patient(first_name="Ana", last_name="Pérez", phone="111111111", email="ana@example.com")
            db.add(patient)
            db.flush()

        tomorrow = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        exists = db.query(Appointment).filter(Appointment.patient_id == patient.id, Appointment.start_at == tomorrow).first()
        if not exists:
            db.add(
                Appointment(
                    patient_id=patient.id,
                    doctor_id=doctor.id,
                    start_at=tomorrow,
                    end_at=tomorrow + timedelta(minutes=30),
                    reason="Control general",
                    status=AppointmentStatus.CONFIRMED,
                )
            )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
