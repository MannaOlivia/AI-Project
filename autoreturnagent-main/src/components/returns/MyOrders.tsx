import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock } from "lucide-react";

interface Order {
  id: string;
  order_id: string;
  order_date: string | null;
  ship_date: string | null;
  ship_mode: string | null;
  customer_name: string | null;
  product_name: string | null;
  category: string | null;
  sub_category: string | null;
  sales: number | null;
  quantity: number | null;
  profit: number | null;
  brand: string | null;
  city: string | null;
  state: string | null;
}

const MyOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get orders assigned to this user
      const { data: userOrders, error: userOrdersError } = await supabase
        .from("user_orders")
        .select("order_id")
        .eq("user_id", user.id);

      if (userOrdersError) throw userOrdersError;

      if (!userOrders || userOrders.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = userOrders.map(uo => uo.order_id);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .order("order_date", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Orders & Returns</h2>
        <Badge variant="secondary">
          {orders.length} Total
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders assigned yet. Orders will be assigned on your first login.</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{order.product_name || 'N/A'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.order_id}
                    </p>
                  </div>
                  <Badge variant="outline">
                    <Package className="h-3 w-3 mr-1" />
                    {order.quantity || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{order.category || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sub-Category:</span>
                    <span className="font-medium">{order.sub_category || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium">{order.brand || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Date:</span>
                    <span className="font-medium">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sales:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(order.sales)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium text-xs">
                      {order.city}, {order.state}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrders;
