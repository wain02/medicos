export type SlotStatus = "free" | "occupied" | "blocked";

export type AvailabilitySlot = {
  start_at: string;
  end_at: string;
  status: SlotStatus;
};

export type AppointmentStatus = "pendiente" | "confirmado" | "cancelado" | "atendido";

export type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
};

export type Appointment = {
  id: number;
  patient: Patient;
  reason?: string | null;
  internal_notes?: string | null;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  doctor_id: number;
};

export type ScheduleBlock = {
  id: number;
  start_at: string;
  end_at: string;
  reason?: string | null;
};
