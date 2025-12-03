import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReturnRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  issue_description: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

interface ReturnDecision {
  id: string;
  vision_analysis: string;
  defect_category: string;
  decision: string;
  decision_reason: string;
  auto_email_draft: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ReturnRequest[]>([]);
  const [decisions, setDecisions] = useState<Record<string, ReturnDecision>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<ReturnDecision | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("return_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "return_requests",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from("return_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);
      setFilteredRequests(requestsData || []);

      // Fetch decisions for all requests
      if (requestsData && requestsData.length > 0) {
        const { data: decisionsData, error: decisionsError } = await supabase
          .from("return_decisions")
          .select("*")
          .in(
            "request_id",
            requestsData.map((r) => r.id)
          );

        if (decisionsError) throw decisionsError;

        const decisionsMap = (decisionsData || []).reduce((acc, decision) => {
          acc[decision.request_id] = decision;
          return acc;
        }, {} as Record<string, ReturnDecision>);

        setDecisions(decisionsMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = requests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, requests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success text-success-foreground";
      case "denied":
        return "bg-destructive text-destructive-foreground";
      case "processing":
        return "bg-status-processing text-white";
      default:
        return "bg-status-pending text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "denied":
        return <XCircle className="h-4 w-4" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const openDetails = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setSelectedDecision(decisions[request.id] || null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Return Requests Dashboard</CardTitle>
          <CardDescription>
            View and manage all return requests with AI-powered analysis
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-md border border-input bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const decision = decisions[request.id];
                return (
                  <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6" onClick={() => openDetails(request)}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{request.product_name}</h3>
                            <Badge className={getStatusColor(decision?.decision || request.status)}>
                              {getStatusIcon(decision?.decision || request.status)}
                              <span className="ml-1">
                                {decision?.decision?.toUpperCase() || request.status.toUpperCase()}
                              </span>
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Customer: {request.customer_name}</p>
                            <p>Email: {request.customer_email}</p>
                            <p className="mt-2">{request.issue_description}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        {request.image_url && (
                          <img
                            src={request.image_url}
                            alt="Product defect"
                            className="w-24 h-24 object-cover rounded-lg ml-4"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
            <DialogDescription>Complete analysis and decision information</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Product Information</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Product:</span> {selectedRequest.product_name}
                  </p>
                  <p>
                    <span className="font-medium">Customer:</span> {selectedRequest.customer_name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {selectedRequest.customer_email}
                  </p>
                  <p>
                    <span className="font-medium">Issue:</span> {selectedRequest.issue_description}
                  </p>
                </div>
              </div>

              {selectedRequest.image_url && (
                <div>
                  <h4 className="font-semibold mb-2">Product Image</h4>
                  <img
                    src={selectedRequest.image_url}
                    alt="Product defect"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {selectedDecision && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">AI Vision Analysis</h4>
                    <p className="text-sm">{selectedDecision.vision_analysis}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Defect Category</h4>
                    <Badge>{selectedDecision.defect_category}</Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Decision</h4>
                    <Badge className={getStatusColor(selectedDecision.decision)}>
                      {selectedDecision.decision.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Decision Reason</h4>
                    <p className="text-sm">{selectedDecision.decision_reason}</p>
                  </div>

                  {selectedDecision.auto_email_draft && (
                    <div>
                      <h4 className="font-semibold mb-2">Auto-Generated Email</h4>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-line">
                          {selectedDecision.auto_email_draft}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
