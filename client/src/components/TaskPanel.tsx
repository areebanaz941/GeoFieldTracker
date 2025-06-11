import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Task, User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getFieldUsers } from "@/lib/api";

interface TaskPanelProps {
  tasks: Task[];
  selectedTask: Task | null;
  onTaskSelect: (task: Task) => void;
  expanded: boolean;
  onExpandToggle: () => void;
  onCreateTask: () => void;
}

export default function TaskPanel({
  tasks,
  selectedTask,
  onTaskSelect,
  expanded,
  onExpandToggle,
  onCreateTask,
}: TaskPanelProps) {
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  // Get user name by id
  const getUserName = (userId?: number) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.id === userId);
    return user ? user.name : "Unknown";
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Format relative time
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const taskDate = new Date(date);
    const diffMs = now.getTime() - taskDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  // Format due date
  const formatDueDate = (date: string) => {
    if (!date) return "";
    
    const dueDate = new Date(date);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays < 7) return `Due in ${diffDays} days`;
    return `Due ${dueDate.toLocaleDateString()}`;
  };

  // Sort tasks by updated date (newest first)
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div
      className={`bg-white border-t border-neutral-200 z-10 transform transition-all duration-300 ease-in-out overflow-hidden ${
        expanded ? "h-1/3" : "h-12"
      }`}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <div className="flex items-center">
          <h2 className="text-base font-medium">Tasks & Assignments</h2>
          <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExpandToggle}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <i className={`ri-arrow-${expanded ? "down" : "up"}-s-line text-lg`}></i>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-500 hover:text-neutral-700"
            onClick={() => window.location.reload()}
          >
            <i className="ri-refresh-line"></i>
          </Button>
          <Button
            size="sm"
            className="bg-primary-500 hover:bg-primary-600 text-white"
            onClick={onCreateTask}
          >
            <i className="ri-add-line mr-1"></i>
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 h-full overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`hover:shadow-md transition-shadow duration-200 cursor-pointer border ${
                    selectedTask?.id === task.id
                      ? "ring-2 ring-primary-500"
                      : "border-neutral-200"
                  }`}
                  onClick={() => onTaskSelect(task)}
                >
                  <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={task.status} />
                      {task.dueDate && (
                        <div className="text-xs text-neutral-500">
                          {formatDueDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-400 hover:text-primary-500 hover:bg-primary-50 h-7 w-7"
                      >
                        <i className="ri-map-pin-line"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-400 hover:text-primary-500 hover:bg-primary-50 h-7 w-7"
                      >
                        <i className="ri-more-2-fill"></i>
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium mb-1">{task.title}</h3>
                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                      {task.description || "No description provided"}
                    </p>
                    {task.location && (
                      <div className="flex items-center text-xs text-neutral-500">
                        <i className="ri-map-pin-line mr-1"></i>
                        <span>
                          {task.location.type === "Point"
                            ? `${task.location.coordinates[1].toFixed(4)}, ${task.location.coordinates[0].toFixed(4)}`
                            : "Location set"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <span>{getInitials(getUserName(task.assignedTo))}</span>
                      </div>
                      <span className="text-xs">{getUserName(task.assignedTo)}</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatRelativeTime(task.updatedAt)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-neutral-500">
                No tasks found. Click "New Task" to create one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
