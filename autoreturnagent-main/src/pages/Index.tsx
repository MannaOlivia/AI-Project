import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReturnSubmission from "@/components/returns/ReturnSubmission";
import AdminDashboard from "@/components/returns/AdminDashboard";
import ManualReviewDashboard from "@/components/returns/ManualReviewDashboard";
import MyOrders from "@/components/returns/MyOrders";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import PolicyManagement from "@/components/policies/PolicyManagement";
import { CustomerPortal } from "@/components/returns/CustomerPortal";
import OrderImporter from "@/components/admin/OrderImporter";
import { Package, Shield, BarChart3, FileText, LogOut, ShoppingBag, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check for test mode bypass
      const urlParams = new URLSearchParams(window.location.search);
      const isTestMode = sessionStorage.getItem('testMode') === 'true' || urlParams.get('testMode') === 'true';
      
      if (isTestMode) {
        console.log("TEST MODE: Bypassing authentication");
        setTestMode(true);
        setIsAdmin(true); // Grant admin access in test mode
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setIsAdmin(roleData?.role === "admin");
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Returns Resolution</h1>
                <p className="text-sm text-muted-foreground">
                  AI-Powered Autonomous Return Processing
                  {testMode && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium">⚡ TEST MODE</span>}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={testMode ? () => {
              sessionStorage.removeItem('testMode');
              navigate('/auth');
            } : handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {testMode ? 'Exit Test Mode' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="customer" className="w-full">
          <TabsList className={`grid w-full max-w-4xl mx-auto mb-8 ${isAdmin ? 'grid-cols-8' : 'grid-cols-4'}`}>
            <TabsTrigger value="customer" className="gap-2">
              <Package className="h-4 w-4" />
              Submit Return
            </TabsTrigger>
            <TabsTrigger value="portal" className="gap-2">
              <Package className="h-4 w-4" />
              My Returns
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="review" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Manual Review
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="policies" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Policies
                </TabsTrigger>
                <TabsTrigger value="setup" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Setup
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="customer">
            <ReturnSubmission />
          </TabsContent>

          <TabsContent value="portal">
            <CustomerPortal />
          </TabsContent>

          <TabsContent value="orders">
            <MyOrders />
          </TabsContent>

          <TabsContent value="admin">
            <AdminDashboard />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="review">
                <ManualReviewDashboard />
              </TabsContent>

              <TabsContent value="analytics">
                <AnalyticsDashboard />
              </TabsContent>

              <TabsContent value="policies">
                <PolicyManagement />
              </TabsContent>

              <TabsContent value="setup">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">System Setup</h2>
                    <p className="text-muted-foreground">
                      Configure initial data and system settings
                    </p>
                  </div>
                  <OrderImporter />
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
