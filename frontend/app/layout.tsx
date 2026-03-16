import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Agenda Médica",
  description: "Gestión de turnos médicos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
