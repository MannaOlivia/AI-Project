import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const returnRequestSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  customerEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  orderId: z.string().trim().min(1, "Order ID is required").max(50, "Order ID must be less than 50 characters"),
  productCategory: z.string().min(1, "Product category is required"),
  issueCategory: z.string().min(1, "Issue category is required"),
  productName: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  issueDescription: z.string().trim().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
});

const ReturnSubmission = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [language, setLanguage] = useState("en");
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    orderId: "",
    productCategory: "",
    issueCategory: "",
    productName: "",
    issueDescription: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserOrders();
  }, []);

  const loadUserOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get orders assigned to this user
      const { data: userOrderIds, error: userOrdersError } = await supabase
        .from("user_orders")
        .select("order_id")
        .eq("user_id", user.id);

      if (userOrdersError) throw userOrdersError;

      if (!userOrderIds || userOrderIds.length === 0) {
        setUserOrders([]);
        return;
      }

      const orderIds = userOrderIds.map(uo => uo.order_id);

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds);

      if (ordersError) throw ordersError;

      setUserOrders(orders || []);
    } catch (error: any) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load your orders",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOrderSelect = (orderId: string) => {
    const selectedOrder = userOrders.find(order => order.order_id === orderId);
    if (selectedOrder) {
      setFormData({
        ...formData,
        orderId: selectedOrder.order_id,
        productName: selectedOrder.product_name || "",
        productCategory: mapCategory(selectedOrder.category),
      });
    }
  };

  const mapCategory = (category: string | null) => {
    if (!category) return "";
    const cat = category.toLowerCase();
    if (cat.includes("furniture") || cat.includes("home")) return "home";
    if (cat.includes("technology") || cat.includes("office")) return "electronics";
    return "other";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate input
    const validation = returnRequestSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDecision(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to submit a return request");
      }
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("defect-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("defect-images")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrlData.publicUrl;
      }

      // Create return request
      const { data: requestData, error: requestError } = await supabase
        .from("return_requests")
        .insert({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          order_id: formData.orderId,
          product_category: formData.productCategory,
          issue_category: formData.issueCategory,
          product_name: formData.productName,
          issue_description: formData.issueDescription,
          image_url: imageUrl,
          status: "processing",
          language: language,
          user_id: user.id,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Call edge function to analyze
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-return",
        {
          body: {
            requestId: requestData.id,
            imageUrl: imageUrl,
            description: formData.issueDescription,
            language: language,
          },
        }
      );

      if (analysisError) throw analysisError;

      setDecision(analysisData);

      toast({
        title: "Analysis Complete",
        description: "Your return request has been processed by our AI system.",
      });

      // Reset form
      setFormData({
        customerName: "",
        customerEmail: "",
        orderId: "",
        productCategory: "",
        issueCategory: "",
        productName: "",
        issueDescription: "",
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit return request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit Return Request</CardTitle>
          <CardDescription>
            Upload a photo of your defective product and describe the issue. Our AI will analyze it
            and provide an instant decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Your Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
                {validationErrors.customerName && (
                  <p className="text-sm text-destructive">{validationErrors.customerName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                  required
                />
                {validationErrors.customerEmail && (
                  <p className="text-sm text-destructive">{validationErrors.customerEmail}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderId">Select Order</Label>
              {loadingOrders ? (
                <div className="flex items-center gap-2 p-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading your orders...</span>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="p-4 border rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No orders found. Please contact support or wait for orders to be assigned.
                  </p>
                </div>
              ) : (
                <Select value={formData.orderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOrders.map((order) => (
                      <SelectItem key={order.id} value={order.order_id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.order_id}</span>
                          <span className="text-xs text-muted-foreground">
                            {order.product_name} - {order.category}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {validationErrors.orderId && (
                <p className="text-sm text-destructive">{validationErrors.orderId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCategory">Product Category</Label>
                <select
                  id="productCategory"
                  value={formData.productCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, productCategory: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select category</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Kitchen</option>
                  <option value="beauty">Beauty & Personal Care</option>
                  <option value="sports">Sports & Outdoors</option>
                  <option value="other">Other</option>
                </select>
                {validationErrors.productCategory && (
                  <p className="text-sm text-destructive">{validationErrors.productCategory}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueCategory">Issue Category</Label>
                <select
                  id="issueCategory"
                  value={formData.issueCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, issueCategory: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select issue</option>
                  <option value="defect">Defect/Damage</option>
                  <option value="size">Size Issue</option>
                  <option value="color">Color Not as Expected</option>
                  <option value="fit">Fit Issue</option>
                  <option value="wrong_item">Wrong Item Received</option>
                  <option value="not_working">Not Working Properly</option>
                  <option value="other">Other</option>
                </select>
                {validationErrors.issueCategory && (
                  <p className="text-sm text-destructive">{validationErrors.issueCategory}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder="Premium Wireless Headphones"
                required
              />
              {validationErrors.productName && (
                <p className="text-sm text-destructive">{validationErrors.productName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueDescription">Issue Description</Label>
              <Textarea
                id="issueDescription"
                value={formData.issueDescription}
                onChange={(e) =>
                  setFormData({ ...formData, issueDescription: e.target.value })
                }
                placeholder="Describe the defect or issue with your product..."
                rows={4}
                required
              />
              {validationErrors.issueDescription && (
                <p className="text-sm text-destructive">{validationErrors.issueDescription}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Upload Photo of Defect</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="image" className="cursor-pointer">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Submit Return Request"
              )}
            </Button>
          </form>

          {decision && (
            <div className="mt-8 p-6 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Decision</h3>
                <Badge
                  variant={
                    decision.decision === "approved" 
                      ? "default" 
                      : decision.decision === "manual_review"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-sm"
                >
                  {decision.decision === "approved" ? (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  ) : decision.decision === "manual_review" ? (
                    <span className="mr-1">⏳</span>
                  ) : (
                    <XCircle className="mr-1 h-4 w-4" />
                  )}
                  {decision.decision === "manual_review" ? "MANUAL REVIEW" : decision.decision.toUpperCase()}
                </Badge>
              </div>

              {decision.decision === "manual_review" && (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    We couldn't automatically verify this request. Our team will manually review it and get back to you within 24-48 hours.
                  </p>
                </div>
              )}

              {decision.confidence !== undefined && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Confidence:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${decision.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round(decision.confidence * 100)}%</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Analysis:</p>
                <p className="text-sm">{decision.visionAnalysis}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Reason:</p>
                <p className="text-sm">{decision.decisionReason}</p>
              </div>

              {decision.emailDraft && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Email Communication:</p>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-line">{decision.emailDraft}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnSubmission;
