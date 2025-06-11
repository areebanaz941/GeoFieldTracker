import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getAllTeams } from "@/lib/api";
import { Team } from "@shared/schema";
import GeoPilotLogo from "../assets/GeoPilot Logo.png";

const baseRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["Supervisor", "Field"]),
});

// Create conditional schema based on role
const registerSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("Supervisor"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
  }),
  z.object({
    role: z.literal("Field"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    teamId: z.string().min(1, "Please select a team"),
  }),
]);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { register, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string>("Field");
  
  // Fetch teams
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: getAllTeams
  });
  
  // Filter teams to only show approved teams
  const approvedTeams = teams.filter((team: Team) => team.status === "Approved");
  
  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "Field",
      ...(selectedRole === "Field" && { teamId: "" }),
    },
  });

  // Watch for role changes to update form state
  const watchRole = form.watch("role");
  
  useEffect(() => {
    setSelectedRole(watchRole);
    
    // Reset the form with updated defaults based on role
    form.reset({
      ...form.getValues(),
      ...(watchRole === "Field" && { teamId: "" })
    });
  }, [watchRole, form]);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Keep teamId as string for MongoDB ObjectId compatibility
      const formattedValues = values;
        
      await register(formattedValues);
      toast({
        title: "Success",
        description: "Your account has been created",
        variant: "default",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Username or email may already be in use.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E0F7F6] to-[#EBF5F0] px-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center mb-2">
              <img src={GeoPilotLogo} alt="GeoPilot Logo" className="h-12 w-auto mr-2" />
              <CardTitle className="text-2xl bg-gradient-to-r from-[#1E5CB3] to-[#0D2E5A] bg-clip-text text-transparent">GeoPilot</CardTitle>
            </div>
            <CardDescription className="text-center italic font-medium text-[#F9973E]">
              Your Field. Your Team. Your Control.
            </CardDescription>
            <CardDescription className="text-center mt-2">
              Create a new account to access the field operations management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="Field">Field Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show team selection only for Field role */}
              {selectedRole === "Field" && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTeams ? "Loading teams..." : "Select your team"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedTeams.length === 0 ? (
                            <SelectItem value="_none" disabled>No approved teams available</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="_placeholder" disabled>Select a team</SelectItem>
                              {approvedTeams.map((team: any) => (
                                <SelectItem key={team._id} value={team._id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {approvedTeams.length === 0 && !isLoadingTeams && (
                        <p className="text-xs text-amber-600 mt-1">
                          No approved teams available. Please contact a supervisor to create and approve a team.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#1E5CB3] to-[#3F7ED5] hover:from-[#164785] hover:to-[#2B5999]" 
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-[#1E5CB3] hover:text-[#164785]">
              Login
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
