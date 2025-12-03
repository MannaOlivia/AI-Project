import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";

interface PendingReview {
  id: string;
  request_id: string;
  customer_name: string;
  customer_email: string;
  order_id: string;
  product_category: string;
  issue_category: string;
  product_name: string;
  issue_description: string;
  image_url: string | null;
  created_at: string;
  vision_analysis: string;
  defect_category: string;
  confidence: number;
  is_suspicious_image: boolean;
  ai_generated_image: boolean;
  decision_reason: string;
  manual_review_reason: string | null;
  analysis_round: number;
}

const ManualReviewDashboard = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [requestingInfo, setRequestingInfo] = useState(false);

  const loadPendingReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("return_requests")
        .select(`
          *,
          return_decisions!inner(*)
        `)
        .eq("status", "manual_review")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Flatten the data structure
      const flattenedData = data?.map((item: any) => ({
        id: item.return_decisions[0].id,
        request_id: item.id,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        order_id: item.order_id,
        product_category: item.product_category,
        issue_category: item.issue_category,
        product_name: item.product_name,
        issue_description: item.issue_description,
        image_url: item.image_url,
        created_at: item.created_at,
        vision_analysis: item.return_decisions[0].vision_analysis,
        defect_category: item.return_decisions[0].defect_category,
        confidence: item.return_decisions[0].confidence,
        is_suspicious_image: item.return_decisions[0].is_suspicious_image,
        ai_generated_image: item.return_decisions[0].ai_generated_image || false,
        decision_reason: item.return_decisions[0].decision_reason,
        manual_review_reason: item.return_decisions[0].manual_review_reason,
        analysis_round: item.analysis_round || 1,
      })) || [];

      setReviews(flattenedData);
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

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const handleDecision = async (decision: "approved" | "denied") => {
    if (!selectedReview) return;
    
    setProcessing(true);
    try {
      // Update decision
      const { error: decisionError } = await supabase
        .from("return_decisions")
        .update({
          decision: decision,
          decision_reason: adminNote || selectedReview.decision_reason,
          admin_notes: adminNote,
        })
        .eq("id", selectedReview.id);

      if (decisionError) throw decisionError;

      // Update request status
      const { error: requestError } = await supabase
        .from("return_requests")
        .update({ status: `${decision}_manual` })
        .eq("id", selectedReview.request_id);

      if (requestError) throw requestError;

      toast({
        title: "Decision Saved",
        description: `Return request ${decision} successfully.`,
      });

      setSelectedReview(null);
      setAdminNote("");
      loadPendingReviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedReview || !adminNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide notes explaining what additional information is needed.",
        variant: "destructive",
      });
      return;
    }

    setRequestingInfo(true);
    try {
      // Update return_decisions with admin notes
      const { error: decisionError } = await supabase
        .from("return_decisions")
        .update({
          admin_notes: adminNote,
        })
        .eq("id", selectedReview.id);

      if (decisionError) throw decisionError;

      // Update return_requests to mark more info requested
      const { error: requestError } = await supabase
        .from("return_requests")
        .update({
          status: "more_info_requested",
          more_info_requested: true,
        })
        .eq("id", selectedReview.request_id);

      if (requestError) throw requestError;

      toast({
        title: "Information Requested",
        description: "Customer will be notified to provide additional information.",
      });

      setSelectedReview(null);
      setAdminNote("");
      loadPendingReviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequestingInfo(false);
    }
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
        <h2 className="text-2xl font-bold">Manual Review Queue</h2>
        <Badge variant="secondary">
          {reviews.length} Pending
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: List of pending reviews */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No pending reviews
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card
                key={review.id}
                className={`cursor-pointer transition-all ${
                  selectedReview?.id === review.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedReview(review)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{review.product_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Order: {review.order_id}
                      </p>
                    </div>
                    {review.is_suspicious_image && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Suspicious
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span>{review.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{review.product_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span>{Math.round(review.confidence * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Review details */}
        {selectedReview && (
          <Card className="lg:sticky lg:top-6 h-fit">
            <CardHeader>
              <CardTitle>Review Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedReview.customer_name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedReview.customer_email}</p>
                    <p><span className="text-muted-foreground">Order ID:</span> {selectedReview.order_id}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Product Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Product:</span> {selectedReview.product_name}</p>
                    <p><span className="text-muted-foreground">Category:</span> {selectedReview.product_category}</p>
                    <p><span className="text-muted-foreground">Issue Type:</span> {selectedReview.issue_category}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Customer Description</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedReview.issue_description}</p>
                </div>

                {selectedReview.image_url && (
                  <div>
                    <h3 className="font-semibold mb-2">Product Image</h3>
                    <img
                      src={selectedReview.image_url}
                      alt="Product defect"
                      className="w-full rounded-lg border"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedReview.ai_generated_image && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          AI-Generated Image Detected
                        </Badge>
                      )}
                      {selectedReview.is_suspicious_image && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Suspicious/Stock Image
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">AI Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence:</span>
                      <Badge variant={selectedReview.confidence < 0.5 ? "destructive" : "secondary"}>
                        {Math.round(selectedReview.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline">{selectedReview.defect_category}</Badge>
                    </div>
                  </div>
                  <p className="text-sm bg-muted p-3 rounded-md mt-2">
                    {selectedReview.vision_analysis}
                  </p>
                </div>

                {selectedReview.manual_review_reason && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Manual Review Reason
                    </h3>
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 rounded-md">
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        {selectedReview.manual_review_reason}
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                        Analysis attempts: {selectedReview.analysis_round - 1}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">AI Recommendation</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {selectedReview.decision_reason}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Admin Notes (Optional)</h3>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDecision("approved")}
                    disabled={processing || requestingInfo}
                    className="flex-1"
                    variant="default"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {processing ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    onClick={() => handleDecision("denied")}
                    disabled={processing || requestingInfo}
                    className="flex-1"
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {processing ? "Processing..." : "Deny"}
                  </Button>
                </div>
                <Button
                  onClick={handleRequestMoreInfo}
                  disabled={processing || requestingInfo}
                  variant="outline"
                  className="w-full"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {requestingInfo ? "Requesting..." : "Request More Pictures/Info"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ManualReviewDashboard;
