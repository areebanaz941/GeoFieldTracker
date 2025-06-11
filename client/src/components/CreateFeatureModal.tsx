import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { createFeature } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { featureStateEnum, featureStatusEnum, maintenanceEnum } from "@shared/schema";

// Define form schema with dynamic specific type options
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feaNo: z.string().min(1, "Feature number is required"),
  feaType: z.enum(["Tower", "Manhole", "FiberCable", "Parcel"]),
  specificType: z.string().min(1, "Specific type is required"),
  feaState: z.enum(["Plan", "Under Construction", "As-Built", "Abandoned"]),
  feaStatus: z.enum(["New", "InProgress", "Completed", "In-Completed", "Submit-Review", "Active"]),
  maintenance: z.enum(["Required", "None"]),
  maintenanceDate: z.string().optional(),
  remarks: z.string().optional(),
  geometry: z.any(),
});

type FeatureFormValues = z.infer<typeof formSchema>;

interface CreateFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectionMode: (mode: boolean) => void;
}

export default function CreateFeatureModal({
  open,
  onClose,
  onOpenChange,
  selectedLocation,
  setSelectionMode,
}: CreateFeatureModalProps) {
  const { toast } = useToast();
  const [specificTypeOptions, setSpecificTypeOptions] = useState<string[]>([]);

  // Initialize form
  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      feaNo: "",
      feaType: "Tower",
      specificType: "",
      feaState: "Plan",
      feaStatus: "New",
      maintenance: "None",
      maintenanceDate: "",
      remarks: "",
      geometry: null,
    },
  });

  // Watch feaType to update specificType options
  const feaType = form.watch("feaType");

  useEffect(() => {
    let options: string[] = [];
    switch (feaType) {
      case "Tower":
        options = ["Mobillink", "Ptcl"];
        break;
      case "Manhole":
        options = ["2-way", "4-way"];
        break;
      case "FiberCable":
        options = ["10F", "24F"];
        break;
      case "Parcel":
        options = ["Commercial", "Residential"];
        break;
      default:
        options = [];
    }
    setSpecificTypeOptions(options);
    form.setValue("specificType", options[0] || "");
  }, [feaType]);

  // Update geometry when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      const geometry = {
        type: "Point",
        coordinates: [selectedLocation.lng, selectedLocation.lat],
      };
      form.setValue("geometry", geometry);
    }
  }, [selectedLocation]);

  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feature created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create feature",
        variant: "destructive",
      });
      console.error("Error creating feature:", error);
    },
  });

  const onSubmit = (values: FeatureFormValues) => {
    if (!values.geometry) {
      toast({
        title: "Location required",
        description: "Please select a location on the map",
        variant: "destructive",
      });
      return;
    }

    createFeatureMutation.mutate({
      ...values,
      maintenanceDate: values.maintenanceDate ? new Date(values.maintenanceDate) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tower">Tower</SelectItem>
                      <SelectItem value="Manhole">Manhole</SelectItem>
                      <SelectItem value="FiberCable">Fiber Cable</SelectItem>
                      <SelectItem value="Parcel">Parcel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter feature name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="feaNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature No.</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter feature number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specificType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{feaType} Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${feaType.toLowerCase()} type`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specificTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="feaState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature State</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {featureStateEnum.enumValues.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="feaStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feature status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["New", "InProgress", "Completed", "In-Completed", "Submit-Review", "Active"].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maintenance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenanceEnum.enumValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch("maintenance") === "Required" && (
              <FormField
                control={form.control}
                name="maintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional remarks"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Location</FormLabel>
              <div className="flex items-center mt-1">
                <Input
                  type="text"
                  readOnly
                  placeholder="Select location on map"
                  value={selectedLocation ? `Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}` : ""}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    setSelectionMode(true);
                    toast({
                      title: "Select location",
                      description: "Click on the map to select a location",
                    });
                  }}
                >
                  <i className="ri-map-pin-line"></i>
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Click on the map to select location</p>
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            className="bg-primary-500 hover:bg-primary-600"
            disabled={createFeatureMutation.isPending}
          >
            {createFeatureMutation.isPending ? "Saving..." : "Save Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
