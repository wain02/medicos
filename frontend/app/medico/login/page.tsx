"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("doctor");
  const [password, setPassword] = useState("doctor123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("medicos_token", data.access_token);
      router.push("/medico");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <section className="card w-full p-6">
        <h1 className="mb-1 text-xl font-bold text-med-primary">Panel médico</h1>
        <p className="mb-5 text-sm text-slate-500">Ingresá con tu usuario y contraseña.</p>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            Usuario
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Contraseña
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <p className="rounded-lg bg-rose-100 p-2 text-sm text-rose-700">{error}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <Link href="/" className="mt-4 block text-center text-sm text-med-accent hover:underline">
          Volver a disponibilidad pública
        </Link>
      </section>
    </main>
  );
}
