import { useEffect } from "react";
import { useLocation } from "wouter";
import useAuth from "@/hooks/useAuth";
import AppHeader from "./AppHeader";
import SideNavigation from "./SideNavigation";

export function AuthenticatedRoutes({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect via the effect
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <SideNavigation />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}