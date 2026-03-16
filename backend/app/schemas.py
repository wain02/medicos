from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AppointmentStatus


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class PatientBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: EmailStr | None = None


class PatientCreate(PatientBase):
    pass


class PatientOut(PatientBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AppointmentBase(BaseModel):
    reason: str | None = None
    internal_notes: str | None = None
    start_at: datetime
    end_at: datetime
    status: AppointmentStatus = AppointmentStatus.PENDING


class AppointmentCreate(AppointmentBase):
    patient: PatientCreate


class AppointmentUpdate(BaseModel):
    reason: str | None = None
    internal_notes: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    status: AppointmentStatus | None = None


class AppointmentOut(AppointmentBase):
    id: int
    patient: PatientOut
    doctor_id: int
    model_config = ConfigDict(from_attributes=True)


class ScheduleBlockCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    reason: str | None = None


class ScheduleBlockOut(BaseModel):
    id: int
    start_at: datetime
    end_at: datetime
    reason: str | None = None
    model_config = ConfigDict(from_attributes=True)


class WeeklyAvailabilityItem(BaseModel):
    weekday: int = Field(ge=0, le=6)
    enabled: bool
    start_time: time
    end_time: time


class WeeklyAvailabilityBulkUpdate(BaseModel):
    items: list[WeeklyAvailabilityItem]


class DayOverrideCreate(BaseModel):
    day: date
    is_working_day: bool
    start_time: time | None = None
    end_time: time | None = None


class DayOverrideOut(BaseModel):
    id: int
    day: date
    is_working_day: bool
    start_time: time | None = None
    end_time: time | None = None
    model_config = ConfigDict(from_attributes=True)


class AvailabilitySlot(BaseModel):
    start_at: datetime
    end_at: datetime
    status: Literal["free", "occupied", "blocked"]


class PublicAvailabilityResponse(BaseModel):
    timezone: str
    slots: list[AvailabilitySlot]


class PublicBookAppointmentRequest(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: EmailStr | None = None
    reason: str | None = None
    start_at: datetime


class PublicBookAppointmentResponse(BaseModel):
    id: int
    status: AppointmentStatus
    start_at: datetime
    end_at: datetime
    message: str


class AgendaResponse(BaseModel):
    timezone: str
    appointments: list[AppointmentOut]
    blocks: list[ScheduleBlockOut]


class DashboardSummary(BaseModel):
    today_count: int
    next_appointments_count: int
    free_slots_today: int
