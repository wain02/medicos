"use client";

import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { SectionTitle } from "@/components/SectionTitle";
import { apiFetch, getToken } from "@/lib/api";
import { Appointment, AppointmentStatus, ScheduleBlock } from "@/lib/types";

const statusOptions: AppointmentStatus[] = ["pendiente", "confirmado", "cancelado", "atendido"];

export default function MedicoPanel() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [summary, setSummary] = useState({ today_count: 0, next_appointments_count: 0, free_slots_today: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Appointment[]>([]);
  const [dayOverrides, setDayOverrides] = useState<Array<{ id: number; day: string; is_working_day: boolean }>>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    reason: "",
    internal_notes: "",
    start_at: "",
    end_at: "",
    status: "pendiente" as AppointmentStatus,
  });

  const [blockForm, setBlockForm] = useState({ start_at: "", end_at: "", reason: "" });
  const [dayBlockDate, setDayBlockDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!getToken()) {
      router.push("/medico/login");
      return;
    }
    setReady(true);
  }, [router]);

  const monthStart = useMemo(() => startOfMonth(viewDate), [viewDate]);
  const monthEnd = useMemo(() => endOfMonth(viewDate), [viewDate]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [monthStart, monthEnd]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => (statusFilter === "all" ? true : a.status === statusFilter));
  }, [appointments, statusFilter]);

  async function loadData() {
    try {
      setError("");
      const [agenda, sum] = await Promise.all([
        apiFetch<{ appointments: Appointment[]; blocks: ScheduleBlock[] }>(
          `/appointments/agenda?start_at=${monthStart.toISOString()}&end_at=${addDays(monthEnd, 1).toISOString()}`,
          {},
          true,
        ),
        apiFetch<{ today_count: number; next_appointments_count: number; free_slots_today: number }>("/dashboard/summary", {}, true),
      ]);
      const overrides = await apiFetch<Array<{ id: number; day: string; is_working_day: boolean }>>(
        "/availability/overrides",
        {},
        true,
      );
      setAppointments(agenda.appointments);
      setBlocks(agenda.blocks);
      setSummary(sum);
      setDayOverrides(overrides);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    }
  }

  useEffect(() => {
    if (ready) loadData();
  }, [ready, viewDate]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of filteredAppointments) {
      const key = format(new Date(appointment.start_at), "yyyy-MM-dd");
      const prev = map.get(key) || [];
      prev.push(appointment);
      map.set(key, prev);
    }
    return map;
  }, [filteredAppointments]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const block of blocks) {
      const key = format(new Date(block.start_at), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [blocks]);

  const selectedDayAppointments = useMemo(() => {
    return (appointmentsByDay.get(selectedDate) || []).sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  }, [appointmentsByDay, selectedDate]);

  async function handleCreateOrUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = {
        patient: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email || null,
        },
        reason: form.reason || null,
        internal_notes: form.internal_notes || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        status: form.status,
      };

      if (editingId) {
        await apiFetch(`/appointments/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            reason: payload.reason,
            internal_notes: payload.internal_notes,
            start_at: payload.start_at,
            end_at: payload.end_at,
            status: payload.status,
          }),
        }, true);
        setMessage("Turno actualizado");
      } else {
        await apiFetch("/appointments", {
          method: "POST",
          body: JSON.stringify(payload),
        }, true);
        setMessage("Turno creado");
      }

      setForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        reason: "",
        internal_notes: "",
        start_at: "",
        end_at: "",
        status: "pendiente",
      });
      setEditingId(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el turno");
    }
  }

  async function cancelAppointment(id: number) {
    if (!confirm("¿Cancelar este turno?")) return;
    try {
      await apiFetch(`/appointments/${id}`, { method: "DELETE" }, true);
      setMessage("Turno cancelado");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  }

  async function createBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await apiFetch("/availability/blocks", {
        method: "POST",
        body: JSON.stringify({
          start_at: new Date(blockForm.start_at).toISOString(),
          end_at: new Date(blockForm.end_at).toISOString(),
          reason: blockForm.reason || null,
        }),
      }, true);
      setBlockForm({ start_at: "", end_at: "", reason: "" });
      setMessage("Bloqueo creado");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear");
    }
  }

  async function removeBlock(id: number) {
    try {
      await apiFetch(`/availability/blocks/${id}`, { method: "DELETE" }, true);
      setMessage("Bloqueo eliminado");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear");
    }
  }

  async function runSearch() {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await apiFetch<Appointment[]>(`/dashboard/search?q=${encodeURIComponent(search.trim())}`, {}, true);
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de búsqueda");
    }
  }

  async function blockFullDay() {
    try {
      await apiFetch(
        "/availability/overrides",
        {
          method: "POST",
          body: JSON.stringify({ day: dayBlockDate, is_working_day: false }),
        },
        true,
      );
      setMessage("Día bloqueado");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear el día");
    }
  }

  async function unBlockFullDay(day: string) {
    try {
      await apiFetch(`/availability/overrides/${day}`, { method: "DELETE" }, true);
      setMessage("Día desbloqueado");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear el día");
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-med-primary">Panel privado del médico</h1>
          <p className="text-sm text-slate-500">Agenda, turnos, bloqueos y disponibilidad.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            localStorage.removeItem("medicos_token");
            router.push("/medico/login");
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Turnos hoy</p>
          <p className="text-2xl font-bold">{summary.today_count}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Próximos turnos</p>
          <p className="text-2xl font-bold">{summary.next_appointments_count}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Huecos libres hoy</p>
          <p className="text-2xl font-bold">{summary.free_slots_today}</p>
        </div>
      </section>

      {message ? <p className="mb-3 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-3 rounded-lg bg-rose-100 p-3 text-sm text-rose-700">{error}</p> : null}

      <section className="mb-4 card p-4 md:p-6">
        <SectionTitle title="Calendario del médico" subtitle="Mismo formato calendario para ver la agenda de un vistazo." />

        <div className="mb-4 flex items-center justify-between gap-2">
          <button className="btn-secondary" onClick={() => setViewDate((d) => subMonths(d, 1))}>
            ← Mes anterior
          </button>
          <h3 className="text-base font-semibold capitalize">{format(viewDate, "MMMM yyyy", { locale: es })}</h3>
          <button className="btn-secondary" onClick={() => setViewDate((d) => addMonths(d, 1))}>
            Mes siguiente →
          </button>
        </div>

        <div className="mb-4 max-w-sm">
          <label className="text-sm">
            Filtro estado
            <select className="input mt-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos</option>
              {statusOptions.map((s) => (
                <option value={s} key={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const count = (appointmentsByDay.get(key) || []).length;
                const blocked = blocksByDay.get(key) || 0;
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
                    <div className="space-y-1 text-[11px]">
                      {count ? <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Turnos: {count}</div> : null}
                      {blocked ? <div className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Bloq.: {blocked}</div> : null}
                      {!count && !blocked ? <div className="text-slate-400">Sin agenda</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card border border-slate-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">
              Turnos del día · {format(new Date(`${selectedDate}T00:00:00`), "EEEE dd/MM/yyyy", { locale: es })}
            </h4>
            <div className="space-y-2">
              {selectedDayAppointments.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {format(new Date(a.start_at), "HH:mm")} - {format(new Date(a.end_at), "HH:mm")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{a.status}</span>
                  </div>
                  <p className="text-sm">
                    {a.patient.first_name} {a.patient.last_name} · {a.patient.phone}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(a.id);
                        setForm({
                          first_name: a.patient.first_name,
                          last_name: a.patient.last_name,
                          phone: a.patient.phone,
                          email: a.patient.email || "",
                          reason: a.reason || "",
                          internal_notes: a.internal_notes || "",
                          start_at: a.start_at.slice(0, 16),
                          end_at: a.end_at.slice(0, 16),
                          status: a.status,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button className="btn-secondary" onClick={() => cancelAppointment(a.id)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
              {!selectedDayAppointments.length ? <p className="text-sm text-slate-500">No hay turnos para esta fecha.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <form className="card space-y-3 p-4" onSubmit={handleCreateOrUpdate}>
          <SectionTitle title={editingId ? "Editar turno" : "Crear turno manual"} />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nombre" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            <input className="input" placeholder="Apellido" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="input" placeholder="Email (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <input className="input" placeholder="Motivo" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <input className="input" placeholder="Notas internas" value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Inicio
              <input className="input mt-1" type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required />
            </label>
            <label className="text-sm">
              Fin
              <input className="input mt-1" type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} required />
            </label>
          </div>
          <label className="text-sm block">
            Estado
            <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>
              {statusOptions.map((s) => (
                <option value={s} key={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="btn-primary" type="submit">
              {editingId ? "Guardar cambios" : "Crear turno"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    first_name: "",
                    last_name: "",
                    phone: "",
                    email: "",
                    reason: "",
                    internal_notes: "",
                    start_at: "",
                    end_at: "",
                    status: "pendiente",
                  });
                }}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
        </form>

        <form className="card space-y-3 p-4" onSubmit={createBlock}>
          <SectionTitle title="Bloquear franja horaria" subtitle="Para ausencias o espacios no laborables" />
          <label className="text-sm block">
            Inicio
            <input className="input mt-1" type="datetime-local" value={blockForm.start_at} onChange={(e) => setBlockForm({ ...blockForm, start_at: e.target.value })} required />
          </label>
          <label className="text-sm block">
            Fin
            <input className="input mt-1" type="datetime-local" value={blockForm.end_at} onChange={(e) => setBlockForm({ ...blockForm, end_at: e.target.value })} required />
          </label>
          <input className="input" placeholder="Motivo (opcional)" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
          <button className="btn-primary" type="submit">
            Bloquear horario
          </button>
        </form>
      </section>

      <section className="mb-4 card p-4">
        <SectionTitle title="Buscador de pacientes" subtitle="Buscar por nombre, apellido o teléfono" />
        <div className="flex gap-2">
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: Pérez o 112233" />
          <button className="btn-primary" onClick={runSearch}>
            Buscar
          </button>
        </div>
        {!!searchResults.length && (
          <ul className="mt-3 space-y-2 text-sm">
            {searchResults.map((a) => (
              <li key={`search-${a.id}`} className="rounded-lg border border-slate-200 p-2">
                {a.patient.first_name} {a.patient.last_name} · {a.patient.phone} · {format(new Date(a.start_at), "dd/MM HH:mm")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 card p-4">
        <SectionTitle title="Bloqueo de día completo" subtitle="Ideal para feriados o ausencias totales" />
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" type="date" value={dayBlockDate} onChange={(e) => setDayBlockDate(e.target.value)} />
          <button className="btn-primary" onClick={blockFullDay}>
            Bloquear día
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {dayOverrides
            .filter((d) => !d.is_working_day)
            .map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                <span>Día bloqueado: {d.day}</span>
                <button className="btn-secondary" onClick={() => unBlockFullDay(d.day)}>
                  Desbloquear día
                </button>
              </li>
            ))}
          {!dayOverrides.filter((d) => !d.is_working_day).length ? (
            <li className="text-slate-500">No hay días completos bloqueados.</li>
          ) : null}
        </ul>
      </section>

      <section className="card p-4">
        <SectionTitle title="Bloqueos activos" />
        <ul className="space-y-2 text-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
              <span>
                {format(new Date(b.start_at), "dd/MM HH:mm")} - {format(new Date(b.end_at), "dd/MM HH:mm")} · {b.reason || "Sin motivo"}
              </span>
              <button className="btn-secondary" onClick={() => removeBlock(b.id)}>
                Desbloquear
              </button>
            </li>
          ))}
          {!blocks.length ? <li className="text-slate-500">No hay bloqueos activos.</li> : null}
        </ul>
      </section>
    </main>
  );
}
