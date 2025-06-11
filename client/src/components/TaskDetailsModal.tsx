import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  getTaskUpdates, 
  createTaskUpdate, 
  updateTaskStatus, 
  getTaskEvidence, 
  addTaskEvidence
} from "@/lib/api";
import { Task, TaskUpdate } from "@shared/schema";

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export default function TaskDetailsModal({
  open,
  onClose,
  onOpenChange,
  task,
}: TaskDetailsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState(task.status);
  const [comment, setComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Fetch task updates
  const { data: updates = [] } = useQuery({
    queryKey: ["/api/tasks", task.id, "updates"],
    queryFn: () => getTaskUpdates(task.id),
    enabled: open,
  });

  // Fetch task evidence
  const { data: evidence = [] } = useQuery({
    queryKey: ["/api/tasks", task.id, "evidence"],
    queryFn: () => getTaskEvidence(task.id),
    enabled: open,
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => updateTaskStatus(task.id, newStatus),
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: `Task status changed to ${status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "updates"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Add task update mutation
  const addUpdateMutation = useMutation({
    mutationFn: () => createTaskUpdate(task.id, comment),
    onSuccess: () => {
      toast({
        title: "Update added",
        description: "Your comment has been added to the task",
      });
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "updates"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Add evidence mutation
  const addEvidenceMutation = useMutation({
    mutationFn: () => {
      if (!imageFile) throw new Error("No image selected");
      
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("description", "Task evidence");
      
      return addTaskEvidence(task.id, formData);
    },
    onSuccess: () => {
      toast({
        title: "Evidence added",
        description: "Image uploaded successfully",
      });
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "evidence"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const handleAddComment = () => {
    if (!comment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }
    
    addUpdateMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadEvidence = () => {
    if (!imageFile) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }
    
    addEvidenceMutation.mutate();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Format location
  const formatLocation = (location: any) => {
    if (!location) return "No location set";
    
    try {
      const locationObj = typeof location === "string" ? JSON.parse(location) : location;
      if (locationObj.type === "Point") {
        return `Lat: ${locationObj.coordinates[1].toFixed(6)}, Lng: ${locationObj.coordinates[0].toFixed(6)}`;
      }
      return "Location set";
    } catch (error) {
      return "Invalid location data";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex items-center justify-between">
          <div className="flex items-center">
            <StatusBadge status={task.status} />
            <DialogTitle className="ml-2">{task.title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-1">Description</h4>
                <p className="text-neutral-800">
                  {task.description || "No description provided"}
                </p>
              </div>
              
              {task.location && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Location</h4>
                  <div className="h-40 bg-neutral-200 rounded-lg relative">
                    {/* This would be a mini-map showing the task location */}
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                      <i className="ri-map-2-line text-4xl"></i>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">
                    <i className="ri-map-pin-line mr-1"></i>
                    <span>{formatLocation(task.location)}</span>
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Updates</h4>
                <div className="space-y-3">
                  {updates.length > 0 ? (
                    updates.map((update: TaskUpdate) => (
                      <div key={update.id} className="bg-neutral-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-2">
                              <span>{getInitials(update.userId.toString())}</span>
                            </div>
                            <span className="text-sm font-medium">User #{update.userId}</span>
                          </div>
                          <span className="text-xs text-neutral-500">{formatDate(update.createdAt)}</span>
                        </div>
                        {update.comment && <p className="text-sm text-neutral-700">{update.comment}</p>}
                        {update.oldStatus && update.newStatus && (
                          <p className="text-sm text-neutral-700">
                            Changed status from "{update.oldStatus}" to "{update.newStatus}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-500 text-center py-2">
                      No updates yet
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Add Update</h4>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter your update or comments"
                  className="resize-none"
                  rows={3}
                />
                <div className="mt-2">
                  <Button 
                    onClick={handleAddComment}
                    disabled={addUpdateMutation.isPending || !comment.trim()}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    <i className="ri-add-line mr-1"></i>
                    <span>{addUpdateMutation.isPending ? "Adding..." : "Add Comment"}</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-neutral-500 mb-3">Details</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-neutral-500">Assigned To</p>
                    <p className="text-sm">
                      {task.assignedTo ? `User #${task.assignedTo}` : "Unassigned"}
                    </p>
                  </div>
                  {task.dueDate && (
                    <div>
                      <p className="text-xs text-neutral-500">Due Date</p>
                      <p className="text-sm">{new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-neutral-500">Created By</p>
                    <p className="text-sm">User #{task.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Created On</p>
                    <p className="text-sm">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Last Updated</p>
                    <p className="text-sm">{new Date(task.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Status</h4>
                <Select
                  value={status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In-Complete">Incomplete</SelectItem>
                    <SelectItem value="Submit-Review">Submit for Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-neutral-500 mb-2">Evidence</h4>
                
                {evidence.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {evidence.map((item) => (
                      <div key={item.id} className="relative group">
                        <img
                          src={item.imageUrl}
                          alt="Evidence"
                          className="w-full h-20 object-cover rounded-md"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white h-8 w-8"
                            onClick={() => window.open(item.imageUrl, "_blank")}
                          >
                            <i className="ri-zoom-in-line"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="border border-dashed border-neutral-300 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-32 mx-auto object-contain"
                      />
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUploadEvidence}
                          disabled={addEvidenceMutation.isPending}
                          className="bg-primary-500 hover:bg-primary-600"
                        >
                          {addEvidenceMutation.isPending ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="ri-image-add-line text-3xl text-neutral-400"></i>
                      <p className="text-sm text-neutral-500 mt-2">Upload evidence images</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="ri-upload-2-line mr-1"></i>
                        <span>Select Files</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
