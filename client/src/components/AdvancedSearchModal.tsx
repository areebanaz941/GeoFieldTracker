import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdvancedSearchModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}

export default function AdvancedSearchModal({
  open,
  onClose,
  onOpenChange,
}: AdvancedSearchModalProps) {
  const { toast } = useToast();
  const [featureType, setFeatureType] = useState("");
  const [featureNo, setFeatureNo] = useState("");
  const [specificType, setSpecificType] = useState("");
  const [featureStatus, setFeatureStatus] = useState("");
  
  const handleReset = () => {
    setFeatureType("");
    setFeatureNo("");
    setSpecificType("");
    setFeatureStatus("");
  };
  
  const handleSearch = () => {
    // In a real application, this would trigger an API call with search parameters
    toast({
      title: "Search initiated",
      description: `Searching for ${featureType || "all"} features with the specified criteria`,
    });
    
    // Close the modal
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Feature Type</label>
            <Select value={featureType} onValueChange={setFeatureType}>
              <SelectTrigger>
                <SelectValue placeholder="All Features" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Features</SelectItem>
                <SelectItem value="Tower">Tower</SelectItem>
                <SelectItem value="Manhole">Manhole</SelectItem>
                <SelectItem value="FiberCable">Fiber Cable</SelectItem>
                <SelectItem value="Parcel">Parcel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Feature No.</label>
            <Input
              placeholder="Enter feature number"
              value={featureNo}
              onChange={(e) => setFeatureNo(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Feature Type</label>
            <Select value={specificType} onValueChange={setSpecificType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="Mobillink">Tower: Mobillink</SelectItem>
                <SelectItem value="Ptcl">Tower: PTCL</SelectItem>
                <SelectItem value="2-way">Manhole: 2-way</SelectItem>
                <SelectItem value="4-way">Manhole: 4-way</SelectItem>
                <SelectItem value="10F">Fiber Cable: 10F</SelectItem>
                <SelectItem value="24F">Fiber Cable: 24F</SelectItem>
                <SelectItem value="Commercial">Parcel: Commercial</SelectItem>
                <SelectItem value="Residential">Parcel: Residential</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Feature Status</label>
            <Select value={featureStatus} onValueChange={setFeatureStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="In-Completed">In-Completed</SelectItem>
                <SelectItem value="Submit-Review">Submit-Review</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-end">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSearch} className="bg-primary-500 hover:bg-primary-600">
            <i className="ri-search-line mr-1"></i>
            <span>Search</span>
            <span className="ml-1 bg-white bg-opacity-20 rounded-full px-1.5 py-0.5 text-xs">12</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
