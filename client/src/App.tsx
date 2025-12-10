import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SapereLayout from "./components/SapereLayout";
import { useAuth } from "./_core/hooks/useAuth";

// Pages
import FamilyDashboard from "./pages/FamilyDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import AgendaPage from "./pages/AgendaPage";
import DocumentosPage from "./pages/DocumentosPage";
import NotificacoesPage from "./pages/NotificacoesPage";
import PacientesPage from "./pages/PacientesPage";
import ProntuarioPage from "./pages/ProntuarioPage";

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to appropriate dashboard based on role
  if (user?.role === "family") {
    return <FamilyDashboard />;
  } else if (user?.role === "therapist" || user?.role === "admin") {
    return <TherapistDashboard />;
  }

  return <FamilyDashboard />;
}

function Router() {
  return (
    <SapereLayout>
      <Switch>
        <Route path="/" component={DashboardRouter} />
        <Route path="/agenda" component={AgendaPage} />
        <Route path="/documentos" component={DocumentosPage} />
        <Route path="/notificacoes" component={NotificacoesPage} />
        <Route path="/pacientes" component={PacientesPage} />
        <Route path="/prontuarios/:id" component={ProntuarioPage} />
        {/* Redirect unknown routes to home */}
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </SapereLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
