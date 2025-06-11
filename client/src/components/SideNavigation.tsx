import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

export default function SideNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => {
    return location === path;
  };

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: "ri-dashboard-line",
    },
    {
      name: "Map View",
      path: "/map",
      icon: "ri-map-pin-line",
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: "ri-task-line",
    },
    {
      name: "Field Teams",
      path: "/teams",
      icon: "ri-team-line",
    },
    {
      name: "Reports",
      path: "/reports",
      icon: "ri-file-chart-line",
    },
  ];

  const featureTypes = [
    { name: "Towers", color: "bg-[#E91E63]" },
    { name: "Manholes", color: "bg-[#9C27B0]" },
    { name: "Fiber Cables", color: "bg-[#3F51B5]" },
    { name: "Parcels", color: "bg-[#009688]" },
  ];

  return (
    <div id="side-nav" className="hidden md:block w-64 bg-white border-r border-neutral-200 flex-shrink-0 z-30">
      <div className="flex flex-col h-full">
        <div className="p-4 mb-2">
          <div className="bg-primary-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <i className="ri-map-2-line text-xl text-primary-500"></i>
              </div>
              <div>
                <p className="text-sm font-medium">Project Fiber Network</p>
                <p className="text-xs text-neutral-500">Active since June 2023</p>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1 px-3 pb-4 overflow-y-auto">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive(item.path) && "bg-primary-50 text-primary-700"
              )}
              onClick={() => setLocation(item.path)}
            >
              <i className={`${item.icon} text-lg mr-3`}></i>
              <span>{item.name}</span>
            </Button>
          ))}
          
          <div className="pt-3 mt-3 border-t border-neutral-200">
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Features
            </h3>
            <div className="mt-2 space-y-1">
              {featureTypes.map((feature) => (
                <Button
                  key={feature.name}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setLocation(`/features/${feature.name.toLowerCase()}`)}
                >
                  <div className={`w-4 h-4 rounded-full ${feature.color} mr-3`}></div>
                  <span>{feature.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation("/settings")}
          >
            <i className="ri-settings-3-line mr-2"></i>
            <span className="text-sm">Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start mt-2"
            onClick={() => setLocation("/help")}
          >
            <i className="ri-question-line mr-2"></i>
            <span className="text-sm">Help & Support</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
