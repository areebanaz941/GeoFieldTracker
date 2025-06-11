import { Card, CardContent } from "@/components/ui/card";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface TeamMembersFilterProps {
  teams: User[];
  onTeamClick: (team: User) => void;
}

export default function TeamMembersFilter({
  teams,
  onTeamClick,
}: TeamMembersFilterProps) {
  // Get activity status
  const getActiveStatus = (lastActive: Date | null | undefined) => {
    if (!lastActive) return "offline";
    
    const now = new Date();
    const lastActiveTime = new Date(lastActive);
    const diffMs = now.getTime() - lastActiveTime.getTime();
    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    
    if (diffMinutes < 15) return "online";
    if (diffMinutes < 60) return "away";
    return "offline";
  };
  
  // Format relative time
  const getLastActivityText = (lastActive: Date | null | undefined) => {
    if (!lastActive) return "Never active";
    
    const now = new Date();
    const lastActiveTime = new Date(lastActive);
    const diffMs = now.getTime() - lastActiveTime.getTime();
    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    
    if (diffMinutes < 1) return "Active now";
    if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    
    return `Active ${Math.floor(diffHours / 24)}d ago`;
  };
  
  return (
    <Card className="absolute bottom-4 left-4 z-10 w-60 shadow-md">
      <CardContent className="p-0">
        <div className="p-2">
          <h3 className="text-sm font-medium text-neutral-700 px-2">Field Teams</h3>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {teams.length > 0 ? (
            teams.map((team) => {
              const status = getActiveStatus(team.lastActive);
              
              return (
                <div
                  key={team.id}
                  className="flex items-center px-2 py-1 hover:bg-neutral-100 rounded mx-2"
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 
                      ${status === "online" ? "bg-green-500" : ""}
                      ${status === "away" ? "bg-yellow-500" : ""}
                      ${status === "offline" ? "bg-red-500" : ""}
                    `}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-neutral-500">
                      {getLastActivityText(team.lastActive)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-neutral-400 hover:text-primary-500 hover:bg-primary-50"
                    onClick={() => onTeamClick(team)}
                  >
                    <i className="ri-map-pin-line"></i>
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-sm text-neutral-500">
              No field teams available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
