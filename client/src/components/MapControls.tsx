import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export default function MapControls() {
  const { toast } = useToast();
  
  const handleZoomIn = () => {
    // This would call a method on the map instance to zoom in
    const map = window.leafletMap;
    if (map) {
      map.zoomIn();
    } else {
      toast({
        title: "Map not initialized",
        description: "The map is not fully initialized yet",
        variant: "destructive",
      });
    }
  };
  
  const handleZoomOut = () => {
    // This would call a method on the map instance to zoom out
    const map = window.leafletMap;
    if (map) {
      map.zoomOut();
    } else {
      toast({
        title: "Map not initialized",
        description: "The map is not fully initialized yet",
        variant: "destructive",
      });
    }
  };
  
  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const map = window.leafletMap;
          if (map) {
            map.setView([latitude, longitude], 16);
            
            toast({
              title: "Location found",
              description: "Map centered on your current location",
            });
          } else {
            toast({
              title: "Map not initialized",
              description: "The map is not fully initialized yet",
              variant: "destructive",
            });
          }
        },
        (error) => {
          toast({
            title: "Geolocation error",
            description: error.message,
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation",
        variant: "destructive",
      });
    }
  };
  
  const handleFullExtent = () => {
    // This would call a method on the map instance to fit all markers
    const map = window.leafletMap;
    if (map) {
      // Reset to default view
      map.setView([24.8607, 67.0011], 13);
      
      toast({
        title: "View reset",
        description: "Map view reset to full extent",
      });
    } else {
      toast({
        title: "Map not initialized",
        description: "The map is not fully initialized yet",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-md shadow-md">
      <div className="p-2 space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
              >
                <i className="ri-zoom-in-line"></i>
                <span className="sr-only">Zoom In</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
              >
                <i className="ri-zoom-out-line"></i>
                <span className="sr-only">Zoom Out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="border-t border-neutral-200"></div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMyLocation}
              >
                <i className="ri-focus-3-line"></i>
                <span className="sr-only">My Location</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>My Location</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleFullExtent}
              >
                <i className="ri-fullscreen-line"></i>
                <span className="sr-only">Full Extent</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Full Extent</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// Declare global window interface to add leafletMap property
declare global {
  interface Window {
    leafletMap: any;
  }
}
