import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, XCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  totalRequests: number;
  approved: number;
  denied: number;
  processing: number;
  approvalRate: number;
  avgProcessingTime: number;
  commonDefects: { category: string; count: number }[];
  scamDetected: number;
  languageStats: { language: string; count: number }[];
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: requests } = await supabase
        .from("return_requests")
        .select("*");

      const { data: decisions } = await supabase
        .from("return_decisions")
        .select("*");

      if (!requests || !decisions) return;

      const approved = requests.filter((r) => r.status === "approved").length;
      const denied = requests.filter((r) => r.status === "denied").length;
      const processing = requests.filter((r) => r.status === "processing").length;

      const approvalRate = requests.length > 0 ? (approved / requests.length) * 100 : 0;

      const avgProcessingTime =
        decisions.length > 0
          ? decisions.reduce((acc, d) => acc + (d.processing_time_ms || 0), 0) / decisions.length
          : 0;

      const defectMap = decisions.reduce((acc, d) => {
        acc[d.defect_category] = (acc[d.defect_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commonDefects = Object.entries(defectMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const scamDetected = decisions.filter((d) => d.is_google_image).length;

      const languageMap = decisions.reduce((acc, d) => {
        const lang = d.language || "en";
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const languageStats = Object.entries(languageMap).map(([language, count]) => ({
        language,
        count,
      }));

      setAnalytics({
        totalRequests: requests.length,
        approved,
        denied,
        processing,
        approvalRate,
        avgProcessingTime: avgProcessingTime / 1000, // Convert to seconds
        commonDefects,
        scamDetected,
        languageStats,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.approved}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.approvalRate.toFixed(1)}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.denied}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProcessingTime.toFixed(2)}s</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Common Defects</CardTitle>
            <CardDescription>Top 5 defect categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.commonDefects.map((defect) => (
                <div key={defect.category} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {defect.category.replace(/_/g, " ")}
                  </span>
                  <Badge variant="secondary">{defect.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud Detection</CardTitle>
            <CardDescription>Potential scam attempts detected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">{analytics.scamDetected}</span>
                <span className="text-sm text-muted-foreground">
                  Google images detected
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Languages</p>
                {analytics.languageStats.map((lang) => (
                  <div key={lang.language} className="flex items-center justify-between">
                    <span className="text-sm uppercase">{lang.language}</span>
                    <Badge variant="outline">{lang.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
