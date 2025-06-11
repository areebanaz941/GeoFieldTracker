import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getAllTasks, getAllFeatures, getFieldUsers } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import CreateTaskModal from "@/components/CreateTaskModal";
import useAuth from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const isSupervisor = user?.role === "Supervisor";
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getAllTasks,
  });

  const { data: features = [] } = useQuery({
    queryKey: ["/api/features"],
    queryFn: getAllFeatures,
  });

  const { data: fieldUsers = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
    enabled: isSupervisor,
  });

  // Calculate stats
  const taskStats = {
    total: tasks.length,
    unassigned: tasks.filter(task => task.status === "Unassigned").length,
    inProgress: tasks.filter(task => task.status === "In Progress").length,
    completed: tasks.filter(task => task.status === "Completed").length,
  };

  const featureStats = {
    total: features.length,
    towers: features.filter(feature => feature.feaType === "Tower").length,
    manholes: features.filter(feature => feature.feaType === "Manhole").length,
    fiberCables: features.filter(feature => feature.feaType === "FiberCable").length,
    parcels: features.filter(feature => feature.feaType === "Parcel").length,
  };

  // Prepare chart data
  const pieData = taskStats.total > 0 ? [
    { name: "Unassigned", value: taskStats.unassigned, color: "#9E9E9E" },
    { name: "In Progress", value: taskStats.inProgress, color: "#2196F3" },
    { name: "Completed", value: taskStats.completed, color: "#4CAF50" },
    { name: "Other", value: taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed, color: "#FF9800" },
  ] : [{ name: "No Data", value: 1, color: "#9E9E9E" }];

  const featurePieData = featureStats.total > 0 ? [
    { name: "Towers", value: featureStats.towers, color: "#E91E63" },
    { name: "Manholes", value: featureStats.manholes, color: "#9C27B0" },
    { name: "Fiber Cables", value: featureStats.fiberCables, color: "#3F51B5" },
    { name: "Parcels", value: featureStats.parcels, color: "#009688" },
  ] : [{ name: "No Data", value: 1, color: "#9E9E9E" }];

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-secondary-custom">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-on-primary">Dashboard</h1>
          {isSupervisor && (
            <Button 
              onClick={() => setCreateTaskModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Create Task
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 responsive-grid">
          <Card className="bg-primary-custom border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
                <p className="text-2xl sm:text-3xl font-bold text-on-primary">{taskStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary-custom border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">Features Tracked</p>
                <p className="text-2xl sm:text-3xl font-bold text-on-primary">{featureStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary-custom border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">Completion Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-on-primary">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary-custom border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">Field Teams</p>
                <p className="text-2xl sm:text-3xl font-bold text-on-primary">{fieldUsers.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 responsive-grid">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary-custom">
              <CardTitle className="text-on-primary">Task Status Distribution</CardTitle>
              <CardDescription className="text-gray-600">
                Overview of current task statuses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {taskStats.total > 0 ? (
                <div className="space-y-4 responsive-text">
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-gray-400 mr-3"></div>
                      <span className="font-medium">Unassigned</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-gray-400" 
                          style={{width: `${Math.round((taskStats.unassigned / taskStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{taskStats.unassigned} ({Math.round((taskStats.unassigned / taskStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                      <span className="font-medium">In Progress</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{width: `${Math.round((taskStats.inProgress / taskStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{taskStats.inProgress} ({Math.round((taskStats.inProgress / taskStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
                      <span className="font-medium">Completed</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-green-500" 
                          style={{width: `${Math.round((taskStats.completed / taskStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{taskStats.completed} ({Math.round((taskStats.completed / taskStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-orange-400 mr-3"></div>
                      <span className="font-medium">Other</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-orange-400" 
                          style={{width: `${Math.round(((taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed) / taskStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">
                        {taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed} ({Math.round(((taskStats.total - taskStats.unassigned - taskStats.inProgress - taskStats.completed) / taskStats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-gray-500">No task data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary-custom">
              <CardTitle className="text-on-primary">Feature Type Distribution</CardTitle>
              <CardDescription className="text-gray-600">
                Breakdown of features by type
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {featureStats.total > 0 ? (
                <div className="space-y-4 responsive-text">
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-pink-500 mr-3"></div>
                      <span className="font-medium">Towers</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-pink-500" 
                          style={{width: `${Math.round((featureStats.towers / featureStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{featureStats.towers} ({Math.round((featureStats.towers / featureStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-purple-500 mr-3"></div>
                      <span className="font-medium">Manholes</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{width: `${Math.round((featureStats.manholes / featureStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{featureStats.manholes} ({Math.round((featureStats.manholes / featureStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 mr-3"></div>
                      <span className="font-medium">Fiber Cables</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{width: `${Math.round((featureStats.fiberCables / featureStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{featureStats.fiberCables} ({Math.round((featureStats.fiberCables / featureStats.total) * 100)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-teal-500 mr-3"></div>
                      <span className="font-medium">Parcels</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                        <div 
                          className="h-full bg-teal-500" 
                          style={{width: `${Math.round((featureStats.parcels / featureStats.total) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="tabular-nums">{featureStats.parcels} ({Math.round((featureStats.parcels / featureStats.total) * 100)}%)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-gray-500">No feature data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary-custom pb-3">
              <CardTitle className="text-on-primary">Recent Tasks</CardTitle>
              <CardDescription className="text-gray-600">
                Latest updated tasks in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0 divide-y">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="mb-2 sm:mb-0">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-full sm:max-w-[300px]">
                          {task.description || "No description provided"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
                        <div className="sm:hidden text-xs text-gray-500">
                          {new Date(task.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-3">
                          <StatusBadge status={task.status} />
                          <span className="hidden sm:inline text-xs text-gray-500">
                            {new Date(task.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </svg>
                    </div>
                    <p>No tasks found</p>
                    <p className="text-sm mt-1">Create tasks to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {createTaskModalOpen && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          onOpenChange={setCreateTaskModalOpen}
        />
      )}
    </div>
  );
}
