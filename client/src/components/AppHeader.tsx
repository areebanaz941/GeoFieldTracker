import { useState } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuth from "@/hooks/useAuth";

export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById("side-nav");
    if (sidebar) {
      sidebar.classList.toggle("hidden");
      
      if (!sidebar.classList.contains("hidden")) {
        // Add overlay for mobile
        const overlay = document.createElement("div");
        overlay.className = "fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden";
        overlay.id = "mobile-nav-overlay";
        document.body.appendChild(overlay);
        
        overlay.addEventListener("click", () => {
          sidebar.classList.add("hidden");
          document.body.removeChild(overlay);
        });
      } else {
        // Remove overlay if exists
        const overlay = document.getElementById("mobile-nav-overlay");
        if (overlay) {
          document.body.removeChild(overlay);
        }
      }
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 flex items-center justify-between px-4 h-14 z-10">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-2" 
          onClick={toggleSidebar}
        >
          <i className="ri-menu-line text-xl"></i>
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex items-center">
          <i className="ri-map-pin-line text-primary-500 text-2xl mr-2"></i>
          <h1 className="text-xl font-medium text-primary-600">GeoWhats</h1>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center">
          <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
            {user.role}
          </span>
          <span className="ml-2 text-sm font-medium">{user.name}</span>
        </div>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-primary-100 text-primary-600">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLocation("/profile")}>
              <i className="ri-user-line mr-2"></i>
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/settings")}>
              <i className="ri-settings-3-line mr-2"></i>
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <i className="ri-logout-box-line mr-2"></i>
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
