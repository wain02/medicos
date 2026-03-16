# Medicos - Gestión de turnos médicos

Aplicación web para gestión real de agenda médica con vista pública para pacientes y panel privado para el médico.

## Resumen

- Frontend: Next.js + React + Tailwind CSS
- Backend: FastAPI + SQLAlchemy
- Base de datos: SQLite en desarrollo, PostgreSQL recomendado para producción
- Autenticación: JWT para el panel del médico
- Deploy recomendado: frontend en Vercel + backend en Render

## Funcionalidades

### Vista pública

- Calendario mensual tipo agenda
- Visualización de horarios libres, ocupados y bloqueados
- Reserva directa del turno por parte del paciente
- Sin exposición de datos de otros pacientes

### Panel privado del médico

- Login seguro con usuario y contraseña
- Calendario de agenda en formato visual
- Crear, editar y cancelar turnos
- Estados: `pendiente`, `confirmado`, `cancelado`, `atendido`
- Bloquear franjas horarias y días completos
- Desbloquear franjas y días
- Buscar pacientes por nombre o teléfono
- Dashboard con resumen de agenda

### Reglas de negocio

- Horario semanal por defecto: lunes a viernes de 09:00 a 18:00
- Excepciones por día y por franja
- No permite doble reserva
- Valida solapamientos entre turnos y bloqueos

## Estructura del proyecto

- [frontend](frontend): aplicación web Next.js
- [backend](backend): API FastAPI
- [backend/app/routes](backend/app/routes): endpoints REST
- [backend/app/services](backend/app/services): lógica de agenda
- [backend/app/models.py](backend/app/models.py): modelos SQLAlchemy
- [frontend/app](frontend/app): rutas de la app web
- [frontend/components](frontend/components): componentes reutilizables

## Requisitos

### Local

- Python 3.11 o 3.12
- Node.js 20+
- npm

### Producción

- Cuenta en Render
- Cuenta en Vercel
- Repo GitHub conectado

## Variables de entorno

### Backend

Copiar [backend/.env.example](backend/.env.example) a `backend/.env`.

Variables principales:

- `APP_NAME=Medicos API`
- `SECRET_KEY=clave-super-segura`
- `ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=720`
- `ADMIN_USERNAME=doctor`
- `ADMIN_PASSWORD=doctor123`
- `ADMIN_FULL_NAME=Dr. Demo`
- `DATABASE_URL=sqlite:///./medicos.db`
- `TIMEZONE=America/Argentina/Buenos_Aires`
- `SLOT_MINUTES=30`
- `CORS_ORIGINS=http://localhost:3000`

### Frontend

Copiar [frontend/.env.example](frontend/.env.example) a `frontend/.env.local`.

- `NEXT_PUBLIC_API_URL=http://localhost:8001/api`

## Cómo correrlo localmente

## 1. Backend

Desde la carpeta [backend](backend):

```bash
cd /home/martin/Desktop/Medicos/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

Probar backend:

- [Health check](https://medicos-8mea.onrender.com/api/health) en producción como referencia
- Local: `http://localhost:8001/api/health`
- Docs local: `http://localhost:8001/docs`

## 2. Frontend

Desde la carpeta [frontend](frontend):

```bash
cd /home/martin/Desktop/Medicos/frontend
cp .env.example .env.local
npm install
npm run dev
```

Editar `frontend/.env.local` si hace falta:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api
```

Abrir:

- `http://localhost:3000`

## Usuario inicial del médico

Se crea automáticamente cuando inicia el backend si no existe:

- Usuario: `doctor`
- Contraseña: `doctor123`

## Flujo de uso local

### Paciente

1. Entrar a la home pública
2. Elegir fecha en el calendario
3. Ver horarios libres del día
4. Tocar `Reservar`
5. Completar datos
6. Confirmar reserva

### Médico

1. Entrar a `/medico/login`
2. Iniciar sesión
3. Ver calendario privado
4. Crear, editar, cancelar o bloquear horarios

## Endpoints principales

### Públicos

- `GET /api/public/availability`
- `POST /api/public/book`

### Privados

- `POST /api/auth/login`
- `GET /api/appointments`
- `GET /api/appointments/agenda`
- `POST /api/appointments`
- `PUT /api/appointments/{appointment_id}`
- `DELETE /api/appointments/{appointment_id}`
- `POST /api/availability/blocks`
- `DELETE /api/availability/blocks/{block_id}`
- `GET /api/availability/weekly`
- `PUT /api/availability/weekly`
- `POST /api/availability/overrides`
- `GET /api/availability/overrides`
- `DELETE /api/availability/overrides/{day}`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/day`
- `GET /api/dashboard/week`
- `GET /api/dashboard/month`
- `GET /api/dashboard/search`

## Deploy recomendado

## Backend en Render

Configurar un Web Service con estos valores:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python version: `3.12.8`

Variables recomendadas en Render:

- `APP_NAME=Medicos API`
- `SECRET_KEY=clave-larga-y-segura`
- `ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=720`
- `ADMIN_USERNAME=doctor`
- `ADMIN_PASSWORD=tu-password-segura`
- `ADMIN_FULL_NAME=Dr. Demo`
- `DATABASE_URL=sqlite:///./medicos.db`
- `TIMEZONE=America/Argentina/Buenos_Aires`
- `SLOT_MINUTES=30`
- `CORS_ORIGINS=https://TU-FRONTEND.vercel.app,http://localhost:3000`
- `PYTHON_VERSION=3.12.8`

Backend de referencia actual:

- [https://medicos-8mea.onrender.com/api/health](https://medicos-8mea.onrender.com/api/health)

## Frontend en Vercel

Configurar proyecto con:

- Root Directory: `frontend`
- Framework: Next.js

Variable en Vercel:

- `NEXT_PUBLIC_API_URL=https://TU-BACKEND.onrender.com/api`

Luego redeployar.

Frontend de referencia actual:

- [https://frontend-9agdlqhmr-wains-projects-6f19ac3f.vercel.app](https://frontend-9agdlqhmr-wains-projects-6f19ac3f.vercel.app)

## Orden correcto de deploy

1. Deploy backend en Render
2. Confirmar que `/api/health` responda ok
3. Deploy frontend en Vercel
4. Configurar `NEXT_PUBLIC_API_URL`
5. Actualizar `CORS_ORIGINS` en Render con la URL final de Vercel
6. Redeploy backend

## Problemas comunes

### Error CORS / `Failed to fetch`

Verificar que en Render `CORS_ORIGINS` tenga exactamente la URL del frontend, por ejemplo:

```env
CORS_ORIGINS=https://frontend-9agdlqhmr-wains-projects-6f19ac3f.vercel.app,http://localhost:3000
```

Después hacer redeploy del backend.

### `Address already in use`

Si el puerto 8000 está ocupado, correr backend en 8001:

```bash
uvicorn app.main:app --reload --port 8001
```

### Error de `email-validator`

Reinstalar dependencias:

```bash
pip install -r requirements.txt
```

### Error de `bcrypt`

Ya está fijada una versión compatible en [backend/requirements.txt](backend/requirements.txt).

### Error de build de Next.js

Limpiar e instalar de nuevo:

```bash
cd frontend
rm -rf node_modules .next package-lock.json
npm cache clean --force
npm install
npm run build
```

## Seguridad

- Cambiar `SECRET_KEY` en producción
- Cambiar `ADMIN_PASSWORD` en producción
- No usar SQLite para alta concurrencia real
- Para producción seria, migrar a PostgreSQL con `DATABASE_URL`

## Mejoras futuras recomendadas

- Migraciones con Alembic
- PostgreSQL en producción
- Recordatorios por WhatsApp o email
- Confirmación automática de turnos
- Bloqueo por vacaciones recurrentes
- Roles adicionales (secretaría, varios médicos)
