import { useEffect, useMemo, useState } from "preact/hooks";
import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { useRouter } from "./hooks/use-router";
import { Sidebar } from "./components/sidebar";
import { Login } from "./components/login";
import { Dashboard } from "./components/dashboard";
import { CalendarView } from "./components/calendar-view";
import { AppointmentList } from "./components/appointment-list";
import { AppointmentDetail } from "./components/appointment-detail";
import { ClientList } from "./components/client-list";
import { ClientDetail } from "./components/client-detail";
import { StaffList } from "./components/staff-list";
import { ServiceList } from "./components/service-list";
import { ProductList } from "./components/product-list";
import { ErrorBanner } from "./components/error-banner";
import { BookingLayout } from "./components/booking/booking-layout";
import { BookingHome } from "./components/booking/booking-home";
import { BookingBook } from "./components/booking/booking-book";
import { BookingMyBookings } from "./components/booking/booking-my-bookings";

function checkAuth(): boolean {
  // Login page is always accessible
  if (window.location.pathname === "/login") return true;
  // Booking portal is public
  if (window.location.pathname.startsWith("/booking")) return true;
  // Admin routes need token
  return !!localStorage.getItem("admin_token");
}

export function App() {
  const [authenticated, setAuthenticated] = useState(checkAuth);

  useEffect(() => {
    const handler = () => setAuthenticated(checkAuth());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const isAgent = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("agent") || params.get("mode") === "agent";
  }, []);

  useEffect(() => {
    if (isAgent) {
      document.documentElement.setAttribute("data-agent", "");
    }
  }, [isAgent]);

  const { view, id, bookingView, navigate } = useRouter();
  const appState = useAppState(isAgent, navigate);

  useEffect(() => {
    if (view === "appointments" && id) {
      appState.selectAppointment(parseInt(id, 10));
    } else if (view === "clients" && id) {
      appState.selectClient(parseInt(id, 10));
    }
  }, [view, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login Page ──
  if (window.location.pathname === "/login") {
    return <Login onLogin={() => { setAuthenticated(true); window.history.pushState(null, "", "/"); }} />;
  }

  // ── Booking Portal (public) ──
  if (bookingView !== null) {
    const renderBooking = () => {
      switch (bookingView) {
        case "book":
          return <BookingBook navigate={navigate} />;
        case "my-bookings":
          return <BookingMyBookings navigate={navigate} />;
        case "servicos":
        case "equipe":
          return <BookingHome navigate={navigate} />;
        default:
          return <BookingHome navigate={navigate} />;
      }
    };

    return (
      <BookingLayout currentPath={`/booking/${bookingView}`} navigate={navigate}>
        {renderBooking()}
      </BookingLayout>
    );
  }

  // ── Auth guard for admin ──
  if (!authenticated) {
    return <Login onLogin={() => { setAuthenticated(true); window.history.pushState(null, "", "/"); }} />;
  }

  // ── Admin Panel ──
  const renderMain = () => {
    if (view === "appointments" && id && appState.selectedAppointment) return <AppointmentDetail />;
    if (view === "clients" && id && appState.selectedClient) return <ClientDetail />;
    switch (view) {
      case "calendar": return <CalendarView />;
      case "appointments": return <AppointmentList />;
      case "clients": return <ClientList />;
      case "staff": return <StaffList />;
      case "services": return <ServiceList />;
      case "products": return <ProductList />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={appState}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentView={view} onLogout={() => { localStorage.removeItem("admin_token"); setAuthenticated(false); }} />
        <main className="flex-1 overflow-y-auto bg-background">
          {appState.loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            renderMain()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
