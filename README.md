# Medicos - Gestión de turnos médicos

Aplicación completa para gestión real de agenda médica.

## Stack

- Frontend: Next.js + React + Tailwind CSS
- Backend: FastAPI (Python) + SQLAlchemy
- Base de datos: SQLite (desarrollo) / PostgreSQL (producción, vía `DATABASE_URL`)
- Auth: JWT (login privado para médico)

## Estructura

- [frontend](frontend)
- [backend](backend)
- [medicos.py](medicos.py) (archivo original del workspace)

## Funcionalidades implementadas

### Vista pública

- Disponibilidad de turnos por rango de fechas
- Reserva directa de turno por el paciente
- Estado de cada horario:
  - Libre
  - Ocupado
  - Bloqueado
- Sin exposición de datos sensibles

### Panel privado del médico

- Login con usuario y contraseña
- Agenda por día/semana/mes
- Crear turno manual
- Editar turno
- Cancelar turno
- Estados: pendiente, confirmado, cancelado, atendido
- Ver datos completos del paciente
- Bloquear franja horaria
- Desbloquear franja
- Bloquear día completo
- Desbloquear día completo
- Filtro por estado
- Buscador por nombre/teléfono
- Dashboard con resumen (hoy, próximos, huecos libres)

### Reglas de disponibilidad

- Horario semanal por defecto: lunes a viernes 09:00 - 18:00
- Excepciones por día
- Bloqueos específicos por franja
- Prevención de doble reserva
- Validación de solapamientos

---

## Backend (FastAPI)

### Carpeta

- [backend](backend)

### Variables de entorno

Copiar [backend/.env.example](backend/.env.example) a `.env` dentro de `backend/`.

### Ejecutar local

1. Ir a backend:
   - `cd backend`
2. Crear entorno virtual:
   - `python -m venv .venv`
3. Activar entorno:
   - Linux/macOS: `source .venv/bin/activate`
4. Instalar dependencias:
   - `pip install -r requirements.txt`
5. Levantar API:
   - `uvicorn app.main:app --reload --port 8000`
6. (Opcional) Cargar datos ejemplo:
   - `python -m app.seed`

API base local: `http://localhost:8000/api`

---

## Frontend (Next.js)

### Carpeta

- [frontend](frontend)

### Variables de entorno

Copiar [frontend/.env.example](frontend/.env.example) a `.env.local` dentro de `frontend/`.

### Ejecutar local

1. Ir a frontend:
   - `cd frontend`
2. Instalar dependencias:
   - `npm install`
3. Ejecutar:
   - `npm run dev`

Frontend local: `http://localhost:3000`

---

## Usuario inicial del médico

Se crea automáticamente al iniciar backend (si no existe):

- Usuario: `doctor`
- Contraseña: `doctor123`

> Cambiar en producción vía variables `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

---

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/public/availability`
- `POST /api/public/book`
- `GET /api/appointments/agenda`
- `POST /api/appointments`
- `PUT /api/appointments/{id}`
- `DELETE /api/appointments/{id}`
- `POST /api/availability/blocks`
- `DELETE /api/availability/blocks/{id}`
- `POST /api/availability/overrides`
- `GET /api/availability/overrides`
- `DELETE /api/availability/overrides/{day}`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/search`

---

## Deploy en Vercel

### Opción recomendada

- Deploy del frontend en Vercel
- Deploy del backend como proyecto separado (Vercel o servicio Python dedicado)

### Frontend en Vercel

1. Importar repo/proyecto en Vercel.
2. Root directory: `frontend`.
3. Variable:
   - `NEXT_PUBLIC_API_URL=https://TU_BACKEND/api`
4. Deploy.

### Backend en Vercel

1. Crear segundo proyecto en Vercel con root `backend`.
2. Vercel usa [backend/vercel.json](backend/vercel.json) y [backend/api/index.py](backend/api/index.py).
3. Configurar variables del `.env.example`.
4. Deploy.

> Para producción robusta, podés usar PostgreSQL y setear `DATABASE_URL`.

---

## Notas de producción

- Cambiar `SECRET_KEY`.
- No usar credenciales por defecto.
- Configurar CORS con dominio real del frontend.
- Migrar de SQLite a PostgreSQL para alta concurrencia.
