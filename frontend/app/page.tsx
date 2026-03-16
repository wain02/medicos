"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SectionTitle } from "@/components/SectionTitle";
import { SlotBadge } from "@/components/SlotBadge";
import { apiFetch } from "@/lib/api";
import { AvailabilitySlot } from "@/lib/types";

export default function PublicPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [booking, setBooking] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    reason: "",
  });

  const monthStart = useMemo(() => startOfMonth(viewDate), [viewDate]);
  const monthEnd = useMemo(() => endOfMonth(viewDate), [viewDate]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [monthStart, monthEnd]);

  async function loadAvailability() {
    try {
      setError("");
      setSuccess("");
      const data = await apiFetch<{ timezone: string; slots: AvailabilitySlot[] }>(
        `/public/availability?start_date=${format(monthStart, "yyyy-MM-dd")}&end_date=${format(monthEnd, "yyyy-MM-dd")}`,
      );
      setSlots(data.slots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la disponibilidad");
    }
  }

  useEffect(() => {
    loadAvailability();
  }, [viewDate]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const key = format(new Date(slot.start_at), "yyyy-MM-dd");
      const prev = map.get(key) || [];
      prev.push(slot);
      map.set(key, prev);
    }
    return map;
  }, [slots]);

  const daySummary = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const daySlots = slotsByDay.get(key) || [];
    const free = daySlots.filter((s) => s.status === "free").length;
    const occupied = daySlots.filter((s) => s.status === "occupied").length;
    const blocked = daySlots.filter((s) => s.status === "blocked").length;
    return { free, occupied, blocked, total: daySlots.length };
  };

  const selectedDaySlots = useMemo(() => {
    return (slotsByDay.get(selectedDate) || []).sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  }, [slotsByDay, selectedDate]);

  const selectedDayFreeSlots = selectedDaySlots.filter((slot) => slot.status === "free");

  async function bookAppointment() {
    if (!selectedSlot) return;
    try {
      setError("");
      setSuccess("");
      await apiFetch<{ message: string }>("/public/book", {
        method: "POST",
        body: JSON.stringify({
          ...booking,
          email: booking.email || null,
          reason: booking.reason || null,
          start_at: selectedSlot,
        }),
      });
      setSuccess("Turno reservado. Te contactaremos para confirmar.");
      setSelectedSlot("");
      setBooking({ first_name: "", last_name: "", phone: "", email: "", reason: "" });
      await loadAvailability();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reservar el turno");
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-med-primary">Agenda Médica</h1>
          <p className="text-sm text-slate-600">Disponibilidad de turnos en tiempo real</p>
        </div>
        <Link href="/medico/login" className="btn-secondary text-center">
          Ingreso médico
        </Link>
      </header>

      <section className="card p-4 md:p-6">
        <SectionTitle title="Elegí una fecha" subtitle="Vista tipo calendario. Después se muestran los horarios libres del día." />

        <div className="mb-4 flex items-center justify-between gap-2">
          <button className="btn-secondary" onClick={() => setViewDate((d) => subMonths(d, 1))}>
            ← Mes anterior
          </button>
          <h3 className="text-base font-semibold capitalize">{format(viewDate, "MMMM yyyy", { locale: es })}</h3>
          <button className="btn-secondary" onClick={() => setViewDate((d) => addMonths(d, 1))}>
            Mes siguiente →
          </button>
        </div>

        {error ? <p className="mb-4 rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="mb-4 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700">{success}</p> : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const summary = daySummary(day);
                const key = format(day, "yyyy-MM-dd");
                const selected = selectedDate === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-24 rounded-xl border p-2 text-left transition ${
                      selected ? "border-med-primary bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    } ${isSameMonth(day, viewDate) ? "" : "opacity-45"}`}
                  >
                    <div className="mb-2 text-sm font-semibold">{format(day, "d")}</div>
                    {summary.total > 0 ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Libres: {summary.free}</div>
                        {!!summary.occupied && (
                          <div className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Ocup.: {summary.occupied}</div>
                        )}
                        {!!summary.blocked && (
                          <div className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Bloq.: {summary.blocked}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">Sin agenda</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card border border-slate-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">
              Horarios del día · {format(new Date(`${selectedDate}T00:00:00`), "EEEE dd/MM/yyyy", { locale: es })}
            </h4>
            <div className="space-y-2">
              {selectedDaySlots.map((slot) => {
                const start = new Date(slot.start_at);
                return (
                  <div key={slot.start_at} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium">{format(start, "HH:mm")}</span>
                    <div className="flex items-center gap-2">
                      <SlotBadge status={slot.status} />
                      {slot.status === "free" ? (
                        <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setSelectedSlot(slot.start_at)}>
                          Reservar
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {!selectedDaySlots.length ? <p className="text-sm text-slate-500">No hay horarios cargados para este día.</p> : null}
              {!!selectedDaySlots.length && !selectedDayFreeSlots.length ? (
                <p className="text-sm text-amber-700">No quedan horarios libres en la fecha seleccionada.</p>
              ) : null}
            </div>

            {selectedSlot ? (
              <div className="mt-4 rounded-xl border border-med-primary/30 bg-blue-50 p-3">
                <p className="mb-2 text-sm font-semibold text-med-primary">
                  Reservar turno: {format(new Date(selectedSlot), "dd/MM/yyyy HH:mm")}
                </p>
                <div className="grid gap-2">
                  <input
                    className="input"
                    placeholder="Nombre"
                    value={booking.first_name}
                    onChange={(e) => setBooking({ ...booking, first_name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Apellido"
                    value={booking.last_name}
                    onChange={(e) => setBooking({ ...booking, last_name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Teléfono"
                    value={booking.phone}
                    onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Email (opcional)"
                    value={booking.email}
                    onChange={(e) => setBooking({ ...booking, email: e.target.value })}
                  />
                  <textarea
                    className="input"
                    placeholder="Motivo (opcional)"
                    value={booking.reason}
                    onChange={(e) => setBooking({ ...booking, reason: e.target.value })}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={bookAppointment}
                    disabled={!booking.first_name || !booking.last_name || !booking.phone}
                  >
                    Confirmar reserva
                  </button>
                  <button className="btn-secondary" onClick={() => setSelectedSlot("")}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
