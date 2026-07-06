import { useState } from "preact/hooks";
import { api } from "../../api";
import { CalendarDays, Clock, Scissors, XCircle, Loader, Phone, Search } from "lucide-preact";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../status-badge";

interface BookingAppointment {
  id: number;
  identifier: string;
  status: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  client_name: string;
  staff_name: string | null;
  staff_color: string | null;
  services?: { service_name: string; price: number; duration: number }[];
}

export function BookingMyBookings({ navigate }: { navigate: (to: string) => void }) {
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const data = await api<{ appointments: BookingAppointment[] }>("GET", `/api/public/bookings?phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`);
      setAppointments(data.appointments);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await api("POST", `/api/public/bookings/${id}/cancel`, { phone: phone.replace(/\D/g, "") });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancelling(null);
    }
  };

  const activeAppointments = appointments.filter((a) => !["cancelled", "no_show", "completed"].includes(a.status));
  const pastAppointments = appointments.filter((a) => ["cancelled", "no_show", "completed"].includes(a.status));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
        <p className="text-muted-foreground mt-1">Consulte e gerencie seus agendamentos pelo telefone</p>
      </div>

      {/* Phone search */}
      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="flex h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Digite seu telefone..."
            value={phone}
            onKeyDown={(e) => (e as KeyboardEvent).key === "Enter" && handleSearch()}
            onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
          />
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={loading || !phone.trim()}
          onClick={handleSearch}
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {searched && !loading && appointments.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum agendamento encontrado para este telefone.</p>
          <button
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => navigate("/booking/book")}
          >
            Fazer um agendamento
          </button>
        </div>
      )}

      {searched && appointments.length > 0 && (
        <div className="space-y-6">
          {/* Active bookings */}
          {activeAppointments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Próximos Agendamentos</h2>
              <div className="space-y-3">
                {activeAppointments.map((apt) => (
                  <div key={apt.id} className="rounded-lg border bg-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">{apt.identifier}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {new Date(apt.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                          <Clock className="h-4 w-4 text-muted-foreground ml-1" />
                          <span className="font-medium">{apt.start_time} - {apt.end_time}</span>
                        </div>
                      </div>
                      <StatusBadge status={apt.status as any} />
                    </div>

                    {apt.services && apt.services.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {apt.services.map((svc, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5">
                              <Scissors className="h-3 w-3 text-muted-foreground" />
                              {svc.service_name}
                            </span>
                            <span className="text-muted-foreground">R$ {svc.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {apt.staff_name && (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />
                            {apt.staff_name}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">R$ {apt.total_price.toFixed(2)}</span>
                        {apt.status === "booked" || apt.status === "confirmed" ? (
                          <button
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => handleCancel(apt.id)}
                            disabled={cancelling === apt.id}
                          >
                            {cancelling === apt.id ? "Cancelando..." : <XCircle className="h-3.5 w-3.5" />}
                            Cancelar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past bookings */}
          {pastAppointments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Histórico</h2>
              <div className="space-y-2">
                {pastAppointments.map((apt) => (
                  <div key={apt.id} className="rounded-lg border bg-card/50 p-4 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(apt.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-sm">{apt.start_time}</span>
                        {apt.staff_name && <span className="text-sm text-muted-foreground">{apt.staff_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={apt.status as any} />
                        <span className="text-sm font-medium">R$ {apt.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Phone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Digite seu telefone para consultar seus agendamentos.</p>
        </div>
      )}
    </div>
  );
}
