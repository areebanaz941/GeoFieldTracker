import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LeafletMap from "@/lib/LeafletMap";
import MapControls from "@/components/MapControls";
import MapFilterControls from "@/components/MapFilterControls";
import TeamMembersFilter from "@/components/TeamMembersFilter";
import TaskPanel from "@/components/TaskPanel";
import CreateFeatureModal from "@/components/CreateFeatureModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import AdvancedSearchModal from "@/components/AdvancedSearchModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAllFeatures, getAllTasks, getFieldUsers, updateUserLocation } from "@/lib/api";
import { Feature, Task, User } from "@shared/schema";

export default function MapView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFilters, setActiveFilters] = useState<string[]>(["All"]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<User | null>(null);
  const [taskPanelExpanded, setTaskPanelExpanded] = useState(true);
  const [createFeatureModalOpen, setCreateFeatureModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [advancedSearchModalOpen, setAdvancedSearchModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Fetch data
  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });
  
  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  // Update user location
  const updateLocationMutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => 
      updateUserLocation(lat, lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/field"] });
    },
  });

  // Update user's location periodically
  useEffect(() => {
    if (!user) return;
    
    // Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocationMutation.mutate({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
      
      // Set up periodic location updates
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            updateLocationMutation.mutate({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.error("Geolocation error:", error);
          }
        );
      }, 5 * 60 * 1000); // Update every 5 minutes
      
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (selectionMode) {
      setSelectedLocation(latlng);
      toast({
        title: "Location Selected",
        description: `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`,
      });
    }
  };

  const handleFeatureClick = (feature: Feature) => {
    toast({
      title: "Feature Clicked",
      description: `${feature.feaType} #${feature.feaNo}`,
    });
  };

  const handleTeamClick = (team: User) => {
    setSelectedTeam(team);
    toast({
      title: "Team Selected",
      description: `${team.name}`,
    });
  };

  return (
    <>
      <div className="relative flex-1 z-0">
        <LeafletMap
          features={features}
          teams={fieldUsers}
          tasks={tasks}
          activeFilters={activeFilters}
          onFeatureClick={handleFeatureClick}
          onTeamClick={handleTeamClick}
          onMapClick={handleMapClick}
          selectionMode={selectionMode}
        />
        
        <MapControls />
        
        <MapFilterControls 
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          onAdvancedSearchClick={() => setAdvancedSearchModalOpen(true)}
        />
        
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={() => setCreateFeatureModalOpen(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </Button>
        </div>
        
        <TeamMembersFilter
          teams={fieldUsers}
          onTeamClick={handleTeamClick}
        />
      </div>
      
      <TaskPanel
        tasks={tasks}
        selectedTask={selectedTask}
        onTaskSelect={(task) => {
          setSelectedTask(task);
          setTaskDetailsModalOpen(true);
        }}
        expanded={taskPanelExpanded}
        onExpandToggle={() => setTaskPanelExpanded(!taskPanelExpanded)}
        onCreateTask={() => setCreateTaskModalOpen(true)}
      />
      
      {createFeatureModalOpen && (
        <CreateFeatureModal
          open={createFeatureModalOpen}
          onClose={() => {
            setCreateFeatureModalOpen(false);
            setSelectionMode(false);
          }}
          onOpenChange={(open) => {
            setCreateFeatureModalOpen(open);
            if (!open) setSelectionMode(false);
          }}
          selectedLocation={selectedLocation}
          setSelectionMode={setSelectionMode}
        />
      )}
      
      {createTaskModalOpen && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => {
            setCreateTaskModalOpen(false);
            setSelectionMode(false);
          }}
          onOpenChange={(open) => {
            setCreateTaskModalOpen(open);
            if (!open) setSelectionMode(false);
          }}
          teams={fieldUsers}
          selectedLocation={selectedLocation}
          setSelectionMode={setSelectionMode}
        />
      )}
      
      {taskDetailsModalOpen && selectedTask && (
        <TaskDetailsModal
          open={taskDetailsModalOpen}
          onClose={() => setTaskDetailsModalOpen(false)}
          onOpenChange={setTaskDetailsModalOpen}
          task={selectedTask}
        />
      )}
      
      {advancedSearchModalOpen && (
        <AdvancedSearchModal
          open={advancedSearchModalOpen}
          onClose={() => setAdvancedSearchModalOpen(false)}
          onOpenChange={setAdvancedSearchModalOpen}
        />
      )}
    </>
  );
}
