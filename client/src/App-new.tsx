import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import TaskList from "./pages/TaskList";
import FieldTeams from "./pages/FieldTeams";
import Reports from "./pages/Reports";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthenticatedRoutes } from "./components/AuthenticatedRoutes";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/">
              <AuthenticatedRoutes>
                <Dashboard />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/map">
              <AuthenticatedRoutes>
                <MapView />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/tasks">
              <AuthenticatedRoutes>
                <TaskList />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/teams">
              <AuthenticatedRoutes>
                <FieldTeams />
              </AuthenticatedRoutes>
            </Route>
            <Route path="/reports">
              <AuthenticatedRoutes>
                <Reports />
              </AuthenticatedRoutes>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;