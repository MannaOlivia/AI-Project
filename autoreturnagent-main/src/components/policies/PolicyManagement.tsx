import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Policy {
  id: string;
  defect_category: string;
  policy_type: string;
  is_returnable: boolean;
  time_limit_days: number | null;
  conditions: string | null;
}

const PolicyManagement = () => {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState({
    defect_category: "",
    policy_type: "standard",
    is_returnable: true,
    time_limit_days: 30,
    conditions: "",
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from("return_policies")
        .select("*")
        .order("defect_category");

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPolicy) {
        const { error } = await supabase
          .from("return_policies")
          .update(formData)
          .eq("id", editingPolicy.id);

        if (error) throw error;

        toast({
          title: "Policy updated",
          description: "The policy has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("return_policies").insert(formData);

        if (error) throw error;

        toast({
          title: "Policy created",
          description: "A new policy has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingPolicy(null);
      setFormData({
        defect_category: "",
        policy_type: "standard",
        is_returnable: true,
        time_limit_days: 30,
        conditions: "",
      });
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      defect_category: policy.defect_category,
      policy_type: policy.policy_type,
      is_returnable: policy.is_returnable,
      time_limit_days: policy.time_limit_days || 30,
      conditions: policy.conditions || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      const { error } = await supabase.from("return_policies").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Policy deleted",
        description: "The policy has been deleted successfully.",
      });

      fetchPolicies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Return Policies</h2>
          <p className="text-muted-foreground">Manage return policies for different defect types</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPolicy(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? "Edit Policy" : "Create Policy"}</DialogTitle>
              <DialogDescription>
                Define return policy rules for specific defect categories
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defect_category">Defect Category</Label>
                <Input
                  id="defect_category"
                  value={formData.defect_category}
                  onChange={(e) =>
                    setFormData({ ...formData, defect_category: e.target.value })
                  }
                  placeholder="e.g., cracked_screen"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy_type">Policy Type</Label>
                <Input
                  id="policy_type"
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_returnable">Is Returnable</Label>
                <Switch
                  id="is_returnable"
                  checked={formData.is_returnable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_returnable: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_limit_days">Time Limit (Days)</Label>
                <Input
                  id="time_limit_days"
                  type="number"
                  value={formData.time_limit_days}
                  onChange={(e) =>
                    setFormData({ ...formData, time_limit_days: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions">Conditions</Label>
                <Textarea
                  id="conditions"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  placeholder="Additional conditions or notes"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingPolicy ? "Update Policy" : "Create Policy"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="capitalize">
                    {policy.defect_category.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription>{policy.policy_type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={policy.is_returnable ? "default" : "destructive"}>
                    {policy.is_returnable ? "Returnable" : "Not Returnable"}
                  </Badge>
                  {policy.time_limit_days && (
                    <Badge variant="outline">{policy.time_limit_days} days</Badge>
                  )}
                </div>
                {policy.conditions && (
                  <p className="text-sm text-muted-foreground">{policy.conditions}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PolicyManagement;
