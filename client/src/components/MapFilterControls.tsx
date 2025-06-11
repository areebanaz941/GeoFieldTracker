import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapFilterControlsProps {
  activeFilters: string[];
  setActiveFilters: (filters: string[]) => void;
  onAdvancedSearchClick: () => void;
}

export default function MapFilterControls({
  activeFilters,
  setActiveFilters,
  onAdvancedSearchClick,
}: MapFilterControlsProps) {
  const handleFilterClick = (filter: string) => {
    if (filter === "All") {
      setActiveFilters(["All"]);
    } else {
      // If "All" is currently selected and user clicks another filter, remove "All"
      if (activeFilters.includes("All")) {
        setActiveFilters([filter]);
      } else {
        // Toggle the filter
        if (activeFilters.includes(filter)) {
          const newFilters = activeFilters.filter((f) => f !== filter);
          // If no filters left, show all
          setActiveFilters(newFilters.length ? newFilters : ["All"]);
        } else {
          setActiveFilters([...activeFilters, filter]);
        }
      }
    }
  };

  const statusOptions = [
    { value: "All", label: "All", color: "bg-primary-500" },
    { value: "Unassigned", label: "Unassigned", color: "bg-[#9E9E9E]" },
    { value: "Assigned", label: "Assigned", color: "bg-[#2196F3]" },
    { value: "Completed", label: "Completed", color: "bg-[#4CAF50]" },
    { value: "In-Complete", label: "Incomplete", color: "bg-[#FFC107]" },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 bg-white rounded-md shadow-md p-2">
      <div className="flex flex-col space-y-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            className={cn(
              "flex items-center justify-start px-3 py-1.5 rounded-md text-sm h-auto",
              activeFilters.includes(option.value) &&
                (option.value === "All" ? "bg-primary-500 text-white" : "bg-neutral-100")
            )}
            onClick={() => handleFilterClick(option.value)}
          >
            {option.value === "All" ? (
              <i className="ri-eye-line mr-2"></i>
            ) : (
              <div className={`w-3 h-3 rounded-full ${option.color} mr-2`}></div>
            )}
            <span>{option.label}</span>
          </Button>
        ))}
        
        <div className="border-t border-neutral-200 my-1"></div>
        
        <Button
          variant="ghost"
          className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm h-auto"
          onClick={onAdvancedSearchClick}
        >
          <span>Advanced</span>
          <i className="ri-search-line"></i>
        </Button>
      </div>
    </div>
  );
}
