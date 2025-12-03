import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, CheckCircle, XCircle, Clock, AlertCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface ReturnRequest {
  id: string;
  order_id: string | null;
  product_name: string;
  product_category: string | null;
  issue_category: string | null;
  issue_description: string;
  status: string;
  more_info_requested: boolean | null;
  created_at: string;
  image_url: string | null;
  original_image_url: string | null;
  decision?: {
    decision: string;
    decision_reason: string;
    confidence: number | null;
    defect_category: string;
    auto_email_draft: string | null;
    is_suspicious_image: boolean | null;
    admin_notes: string | null;
    created_at: string;
  } | null;
}

export function CustomerPortal() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingForRequest, setUploadingForRequest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('customer-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'return_requests',
          filter: `user_id=eq.${supabase.auth.getSession().then(s => s.data.session?.user.id)}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requestsData, error: requestsError } = await supabase
        .from('return_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch decisions for each request
      const requestsWithDecisions = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: decisionData } = await supabase
            .from('return_decisions')
            .select('*')
            .eq('request_id', request.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...request,
            decision: decisionData
          };
        })
      );

      setRequests(requestsWithDecisions);
    } catch (error: any) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (requestId: string, file: File) => {
    setUploadingForRequest(requestId);
    try {
      // Find the request to check original image
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Check if trying to upload the same image
      if (request.original_image_url && request.image_url === request.original_image_url) {
        toast({
          title: "Duplicate Image",
          description: "Please upload a different image than the one you originally submitted. Take a new photo showing the issue more clearly.",
          variant: "destructive",
        });
        setUploadingForRequest(null);
        return;
      }

      // Upload new image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('defect-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('defect-images')
        .getPublicUrl(filePath);

      // Check if the new image URL matches the original
      if (request.original_image_url && publicUrl === request.original_image_url) {
        toast({
          title: "Duplicate Image",
          description: "This appears to be the same image. Please upload a different photo.",
          variant: "destructive",
        });
        setUploadingForRequest(null);
        return;
      }

      // Update request with new image and reset status for re-analysis
      const { error: updateError } = await supabase
        .from('return_requests')
        .update({
          image_url: publicUrl,
          status: 'processing',
          more_info_requested: false,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Trigger re-analysis via edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('analyze-return', {
          body: {
            requestId: requestId,
            imageUrl: publicUrl,
            description: request.issue_description,
            language: 'en',
          },
        });
      }

      toast({
        title: "Success",
        description: "New image uploaded. Your request is being re-analyzed...",
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingForRequest(null);
    }
  };

  const getStatusBadge = (status: string, moreInfoRequested?: boolean, decision?: string) => {
    if (moreInfoRequested || status === "more_info_requested") {
      return <Badge variant="default" className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />More Info Needed</Badge>;
    }
    if (decision === "approve" || decision === "approved") {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    if (decision === "deny" || decision === "denied") {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
    }
    if (decision === "manual_review" || status === "pending" || status === "manual_review") {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Return Requests</CardTitle>
          <CardDescription>Track your return requests and view decision history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No return requests yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Return Requests</CardTitle>
          <CardDescription>Track your return requests and view decision history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.order_id || "N/A"}
                  </TableCell>
                  <TableCell>{request.product_name}</TableCell>
                  <TableCell>{request.product_category || "N/A"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.issue_category || request.issue_description}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status, request.more_info_requested || false, request.decision?.decision)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {request.decision?.confidence 
                      ? `${Math.round(request.decision.confidence * 100)}%`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Decision Details */}
      <div className="grid gap-6">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Details - Order {request.order_id}</span>
                {getStatusBadge(request.status, request.more_info_requested || false, request.decision?.decision)}
              </CardTitle>
              <CardDescription>
                {request.decision ? `Analyzed on ${format(new Date(request.decision.created_at), "MMM d, yyyy 'at' h:mm a")}` : `Submitted on ${format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* More Info Requested Alert */}
              {(request.more_info_requested || request.status === "more_info_requested") && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-100">Additional Information Required</h4>
                      <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                        Our team needs more information to process your return request.
                      </p>
                      {request.decision?.admin_notes && (
                        <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-sm">
                          <strong>Admin Notes:</strong> {request.decision.admin_notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      Upload New Picture(s)
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(request.id, file);
                      }}
                      disabled={uploadingForRequest === request.id}
                      className="cursor-pointer"
                    />
                    {uploadingForRequest === request.id && (
                      <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading and resubmitting...
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-1">Product</h4>
                <p className="text-sm text-muted-foreground">{request.product_name}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Issue Reported</h4>
                <p className="text-sm text-muted-foreground">{request.issue_description}</p>
              </div>

              {request.decision && (
                <>
                  <div>
                    <h4 className="font-semibold mb-1">Defect Category</h4>
                    <p className="text-sm text-muted-foreground">{request.decision.defect_category}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">Decision Reason</h4>
                    <p className="text-sm text-muted-foreground">{request.decision.decision_reason}</p>
                  </div>
                </>
              )}

              {request.decision?.confidence && (
                <div>
                  <h4 className="font-semibold mb-1">Confidence Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${request.decision.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(request.decision.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {request.decision?.is_suspicious_image && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Image flagged for manual review
                  </p>
                </div>
              )}

              {request.decision?.auto_email_draft && (
                <div>
                  <h4 className="font-semibold mb-1">Response Message</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{request.decision.auto_email_draft}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
