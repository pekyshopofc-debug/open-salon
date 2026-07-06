import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  booked: { label: "Agendado", variant: "default" },
  confirmed: { label: "Confirmado", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "outline" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  no_show: { label: "Não Compareceu", variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
