import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllTasks, getFieldUsers } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import CreateTaskModal from "@/components/CreateTaskModal";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import useAuth from "@/hooks/useAuth";
import { Task } from "@shared/schema";

export default function TaskList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });

  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  // Filter tasks based on search and status
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus =
      statusFilter === "All" || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get assignee name for each task
  const getAssigneeName = (assigneeId?: number) => {
    if (!assigneeId) return "Unassigned";
    const assignee = fieldUsers.find((user) => user.id === assigneeId);
    return assignee ? assignee.name : "Unknown";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <Button onClick={() => setCreateTaskModalOpen(true)} className="bg-primary-500 hover:bg-primary-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            Create Task
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In-Complete">Incomplete</SelectItem>
                    <SelectItem value="Submit-Review">Submit Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <Card
                key={task.id}
                className="hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => {
                  setSelectedTask(task);
                  setTaskDetailsModalOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} />
                        {task.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full 
                            ${task.priority === 'High' || task.priority === 'Urgent'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-lg">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        Assigned to: <span className="font-medium">{getAssigneeName(task.assignedTo)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="text-sm text-gray-500">
                          Due: <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        Updated: {new Date(task.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== "All"
                ? "No tasks match your search criteria"
                : "No tasks found. Create your first task!"}
            </div>
          )}
        </div>
      </div>

      {createTaskModalOpen && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          onOpenChange={setCreateTaskModalOpen}
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
    </div>
  );
}
