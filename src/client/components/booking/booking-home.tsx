import { useEffect, useState } from "preact/hooks";
import { Scissors, Sparkles, Clock, Shield, Star, ArrowRight, User } from "lucide-preact";
import { api } from "../../api";
import { Avatar } from "../avatar";

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
  bio: string;
  specialties: string;
  title: string;
  color: string;
}

export function BookingHome({ navigate }: { navigate: (to: string) => void }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);

  useEffect(() => {
    api<{ services: ServiceItem[] }>("GET", "/api/public/services").then((d) => setServices(d.services)).catch(() => {});
    api<{ staff: StaffItem[] }>("GET", "/api/public/staff").then((d) => setStaff(d.staff)).catch(() => {});
  }, []);

  // Group services by category
  const categories = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm mb-6">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Agende online em segundos
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Seu Visual,{" "}
              <span className="text-primary">Nosso Compromisso</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-xl">
              Agende seu horário com os melhores profissionais. Rápido, fácil e sem sair de casa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => navigate("/booking/book")}
              >
                Agendar Agora
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
                onClick={() => navigate("/booking/servicos")}
              >
                Ver Serviços
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Clock, title: "Agende Online", desc: "Escolha o melhor horário para você, 24 horas por dia, sem precisar ligar." },
              { icon: User, title: "Profissionais Top", desc: "Equipe qualificada e experiente pronta para te atender." },
              { icon: Shield, title: "Cancelamento Fácil", desc: "Imprevistos acontecem. Cancele ou remarque com poucos cliques." },
            ].map((feat) => (
              <div key={feat.title} className="flex flex-col items-center text-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Nossos Serviços</h2>
            <p className="text-muted-foreground mt-1">Confira nossa tabela de preços</p>
          </div>
          <button
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => navigate("/booking/servicos")}
          >
            Ver Todos <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((svc) => (
            <div key={svc.id} className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: svc.color }} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{svc.category}</span>
              </div>
              <h3 className="font-semibold">{svc.name}</h3>
              {svc.description && <p className="mt-1 text-sm text-muted-foreground">{svc.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{svc.duration} min</span>
                <span className="text-lg font-bold">R$ {svc.price.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Preview */}
      {staff.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight">Nossa Equipe</h2>
              <p className="text-muted-foreground mt-1">Profissionais dedicados a realçar sua beleza</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {staff.map((s) => (
                <div key={s.id} className="rounded-lg border bg-card p-6 text-center transition-shadow hover:shadow-md">
                  <Avatar name={s.name} photoUrl={s.photo_url} color={s.color} size="lg" className="mx-auto mb-3" />
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.title && <p className="text-sm text-muted-foreground">{s.title}</p>}
                  {s.specialties && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{s.specialties}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary/5 border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-3">Pronto para agendar?</h2>
          <p className="text-muted-foreground mb-6">Escolha o profissional, o serviço e o horário ideal para você.</p>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
            onClick={() => navigate("/booking/book")}
          >
            Agendar Agora <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
