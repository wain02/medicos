import { SlotStatus } from "@/lib/types";

const styles: Record<SlotStatus, string> = {
  free: "bg-emerald-100 text-emerald-800",
  occupied: "bg-amber-100 text-amber-800",
  blocked: "bg-rose-100 text-rose-800",
};

const labels: Record<SlotStatus, string> = {
  free: "Libre",
  occupied: "Ocupado",
  blocked: "Bloqueado",
};

export function SlotBadge({ status }: { status: SlotStatus }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}
