import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import GeoPilotLogo from "../assets/GeoPilot Logo.png";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  // Using useEffect hook to handle navigation after render
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(values.username, values.password);
      toast({
        title: "Success",
        description: "You have successfully logged in",
        variant: "default",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (userType: string) => {
    setIsLoading(true);
    try {
      if (userType === "supervisor") {
        await login("supervisor", "password");
      } else {
        await login("fielduser", "password");
      }
      toast({
        title: "Success",
        description: `Logged in as ${userType} user`,
        variant: "default",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login with demo account",
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
              Enter your credentials to access the field operations management system
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
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
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
              
              <div className="pt-2">
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200"></span>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">or use demo accounts</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    className="flex-1 bg-[#1E5CB3] hover:bg-[#164785]"
                    onClick={() => handleDemoLogin("supervisor")} 
                    disabled={isLoading}
                  >
                    Supervisor Demo
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 bg-[#F9973E] hover:bg-[#E78020] text-white"
                    onClick={() => handleDemoLogin("fielduser")}
                    disabled={isLoading}
                  >
                    Field Demo
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <a href="/register" className="font-medium text-[#1E5CB3] hover:text-[#164785]">
              Register
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
