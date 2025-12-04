import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Clear any invalid sessions first
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Clear invalid session
        supabase.auth.signOut();
      } else if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(1);
      
      // Check via auth API
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email_confirmed: true, // Skip email verification
          }
        },
      });

      if (error) {
        // Check if it's a "user already exists" error
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast({
            title: "User already exists",
            description: "This email is already registered. Please login instead.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Assign orders to user on signup
      if (data.session) {
        try {
          await supabase.functions.invoke('assign-orders', {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`
            }
          });
        } catch (assignError) {
          console.log('Order assignment info:', assignError);
          // Don't block signup if assignment fails
        }
      }

      toast({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      
      // Auto-login after signup if session exists
      if (data.session) {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Assign orders to user on first login
      if (data.session) {
        try {
          await supabase.functions.invoke('assign-orders', {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`
            }
          });
        } catch (assignError) {
          console.log('Order assignment info:', assignError);
          // Don't block login if assignment fails
        }
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Returns Resolution</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Sign in to access the returns dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Admin Quick Login Button */}
            <div className="mb-4">
              <Button 
                type="button"
                variant="secondary"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: "sujalchourasia11@gmail.com",
                      password: "123456",
                    });
                    if (error) throw error;
                    toast({
                      title: "Admin Login Successful",
                      description: "Welcome, Admin!",
                    });
                    navigate("/");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                👑 Login as Admin (Quick Access)
              </Button>
            </div>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="text"
                      placeholder="any email format works (e.g. admin@test)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
