import { useEffect, useState } from "preact/hooks";
import { api } from "../../api";
import { Check, ChevronLeft, ChevronRight, CalendarDays, Scissors, User, Clock, Loader } from "lucide-preact";
import { Avatar } from "../avatar";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  category: string;
}

interface StaffItem {
  id: number;
  name: string;
  photo_url: string;
  title: string;
  color: string;
}

const steps = ["Serviços", "Profissional", "Data e Hora", "Confirmação"];

export function BookingBook({ navigate }: { navigate: (to: string) => void }) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);

  // Step 0: service selection
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  // Step 1: staff selection
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

  // Step 2: date/time
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 3: confirmation
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ services: ServiceItem[] }>("GET", "/api/public/services").then((d) => setServices(d.services)).catch(() => {});
    api<{ staff: StaffItem[] }>("GET", "/api/public/staff").then((d) => setStaff(d.staff)).catch(() => {});
  }, []);

  // Load slots when staff + date + services change
  useEffect(() => {
    if (!selectedStaff || !selectedDate || selectedServices.length === 0) return;
    const totalDuration = services
      .filter((s) => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.duration, 60);

    setLoadingSlots(true);
    api<{ slots: string[] }>("GET", `/api/public/slots?staff_id=${selectedStaff}&date=${selectedDate}&duration=${totalDuration}`)
      .then((d) => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedStaff, selectedDate, selectedServices]);

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0);

  const selectedServiceObjs = services.filter((s) => selectedServices.includes(s.id));

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return true; // staff is optional
    if (step === 2) return !!selectedSlot;
    return true;
  };

  const handleBook = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Nome e telefone são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("POST", "/api/public/book", {
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        email,
        service_ids: selectedServices,
        staff_id: selectedStaff,
        scheduled_date: selectedDate,
        start_time: selectedSlot,
        notes,
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto mb-6">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
        <p className="text-muted-foreground mb-6">
          Seu horário foi reservado com sucesso. Você receberá uma confirmação em breve.
        </p>
        <div className="space-y-3 mb-8 rounded-lg border bg-card p-6 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Serviços:</span>
            <span className="font-medium">{selectedServiceObjs.map((s) => s.name).join(", ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Data:</span>
            <span className="font-medium">{new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Horário:</span>
            <span className="font-medium">{selectedSlot}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duração:</span>
            <span className="font-medium">{totalDuration} min</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-bold text-lg">R$ {totalPrice.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            className="rounded-lg border bg-background px-6 py-2.5 text-sm font-medium hover:bg-accent"
            onClick={() => navigate("/booking/my-bookings")}
          >
            Meus Agendamentos
          </button>
          <button
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setStep(0);
              setSelectedServices([]);
              setSelectedStaff(null);
              setSelectedSlot(null);
              setName("");
              setPhone("");
              setEmail("");
              setNotes("");
              setDone(false);
            }}
          >
            Novo Agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Steps indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i < step ? "bg-primary text-primary-foreground" :
                    i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                    "bg-muted text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className="mt-1.5 text-[10px] font-medium text-muted-foreground hidden sm:block">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("h-0.5 w-8 sm:w-16 mx-2", i < step ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Services */}
      {step === 0 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold">Escolha os Serviços</h2>
            <p className="text-sm text-muted-foreground">Selecione um ou mais serviços desejados</p>
          </div>
          <div className="space-y-3">
            {services.map((svc) => {
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-all",
                    isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50 hover:bg-accent/50",
                  )}
                  onClick={() => {
                    setSelectedServices((prev) =>
                      prev.includes(svc.id) ? prev.filter((id) => id !== svc.id) : [...prev, svc.id],
                    );
                    setSelectedSlot(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: svc.color }} />
                          <span className="font-medium">{svc.name}</span>
                        </div>
                        {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">R$ {svc.price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{svc.duration} min</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedServices.length > 0 && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{totalDuration} min</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="font-semibold">R$ {totalPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Staff */}
      {step === 1 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold">Escolha o Profissional</h2>
            <p className="text-sm text-muted-foreground">Selecione quem você prefere ou deixe em aberto</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={cn(
                "rounded-lg border p-4 text-center transition-all",
                selectedStaff === null ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50",
              )}
              onClick={() => setSelectedStaff(null)}
            >
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mx-auto mb-2">
                <span className="text-xl font-bold text-muted-foreground">?</span>
              </div>
              <div className="font-medium">Qualquer Profissional</div>
              <div className="text-xs text-muted-foreground">Disponibilidade mais rápida</div>
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                className={cn(
                  "rounded-lg border p-4 text-center transition-all",
                  selectedStaff === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50",
                )}
                onClick={() => setSelectedStaff(s.id)}
              >
                <Avatar name={s.name} photoUrl={s.photo_url} color={s.color} size="lg" className="mx-auto mb-2" />
                <div className="font-medium">{s.name}</div>
                {s.title && <div className="text-xs text-muted-foreground">{s.title}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold">Escolha a Data e Horário</h2>
            <p className="text-sm text-muted-foreground">Selecione o melhor dia e horário disponível</p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Data</label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onInput={(e) => {
                setSelectedDate((e.target as HTMLInputElement).value);
                setSelectedSlot(null);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Horários Disponíveis</label>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader className="h-5 w-5 animate-spin mr-2" />
                Carregando horários...
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {selectedStaff ? "Nenhum horário disponível nesta data para o profissional selecionado." : "Selecione um profissional primeiro para ver os horários."}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    className={cn(
                      "rounded-lg border py-3 text-sm font-medium transition-all",
                      selectedSlot === slot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/50 hover:bg-accent",
                    )}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold">Confirme seus Dados</h2>
            <p className="text-sm text-muted-foreground">Preencha suas informações para finalizar</p>
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-card p-4 mb-6 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Scissors className="h-4 w-4" />
              <span>{selectedServiceObjs.map((s) => s.name).join(", ")}</span>
            </div>
            {selectedStaff && (() => {
              const s = staff.find((st) => st.id === selectedStaff);
              return s ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{s.name}</span>
                </div>
              ) : null;
            })()}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} às {selectedSlot}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{totalDuration} min · <strong>R$ {totalPrice.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome *</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Seu nome completo"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefone *</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="(11) 99999-9999"
                value={phone}
                onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">E-mail (opcional)</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Observações (opcional)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Alguma observação? Preferências, alergias..."
                value={notes}
                onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button
          className="inline-flex items-center gap-1 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>

        {step < 3 ? (
          <button
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Avançar <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={saving || !name.trim() || !phone.trim()}
            onClick={handleBook}
          >
            {saving ? "Confirmando..." : "Confirmar Agendamento"}
          </button>
        )}
      </div>
    </div>
  );
}
