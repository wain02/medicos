const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("medicos_token") || "";
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Error inesperado" }));
    throw new Error(data.detail || "Error en API");
  }
  return response.json();
}
