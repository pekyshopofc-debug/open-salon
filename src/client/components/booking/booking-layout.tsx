import { Scissors, Menu, X } from "lucide-preact";
import { useState } from "preact/hooks";

interface BookingLayoutProps {
  children: preact.ComponentChildren;
  currentPath: string;
  navigate: (to: string) => void;
}

export function BookingLayout({ children, currentPath, navigate }: BookingLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: "/booking", label: "Início" },
    { path: "/booking/servicos", label: "Serviços" },
    { path: "/booking/equipe", label: "Equipe" },
    { path: "/booking/book", label: "Agendar" },
    { path: "/booking/my-bookings", label: "Meus Agendamentos" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <button
            className="flex items-center gap-2.5"
            onClick={() => navigate("/booking")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">Barber Salon</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  currentPath === link.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
            <button
              className="ml-3 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              onClick={() => navigate("/booking/book")}
            >
              Agende Agora
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-accent"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="border-t md:hidden">
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  className={`block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    currentPath === link.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() => {
                    navigate(link.path);
                    setMenuOpen(false);
                  }}
                >
                  {link.label}
                </button>
              ))}
              <button
                className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  navigate("/booking/book");
                  setMenuOpen(false);
                }}
              >
                Agende Agora
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="h-5 w-5 text-primary" />
                <span className="font-bold">Barber Salon</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Seu salão de confiança. Agende online e evite filas.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Horários</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Seg-Sáb: 08:00 - 20:00</p>
                <p>Dom: Fechado</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Contato</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>(11) 99999-9999</p>
                <p>contato@barbersalon.com</p>
                <p>Rua Exemplo, 123</p>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Barber Salon. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
