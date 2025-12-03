import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';

const OrderImporter = () => {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    try {
      // Fetch the Excel file
      const response = await fetch('/data/Superstore_Dataset.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse the Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet);

      setProgress(30);

      // Transform the data to match our schema
      const orders = data.map((row: any) => ({
        'Order ID': row['Order ID'],
        'Order Date': row['Order Date'],
        'Ship Date': row['Ship Date'],
        'Ship Mode': row['Ship Mode'],
        'Customer ID': row['Customer ID'],
        'Customer Name': row['Customer Name'],
        'Segment': row['Segment'],
        'Country': row['Country'],
        'City': row['City'],
        'State': row['State'],
        'Region': row['Region'],
        'Product ID': row['Product ID'],
        'Category': row['Category'],
        'Sub-Category': row['Sub-Category'],
        'Product Name': row['Product Name'],
        'Sales': row['Sales'],
        'Quantity': row['Quantity'],
        'Profit': row['Profit'],
        'Brand': row['Brand'],
        'Discount %': row['Discount %'],
        'Cost': row['Cost'],
      }));

      setProgress(50);

      console.log(`Parsed ${orders.length} orders from Excel`);

      // Call the import function
      const { data: result, error } = await supabase.functions.invoke('import-orders', {
        body: { orders }
      });

      if (error) throw error;

      setProgress(100);
      setImported(true);

      toast({
        title: "Success!",
        description: `Successfully imported ${result.total} orders`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to import orders",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Orders from Excel</CardTitle>
        <CardDescription>
          Import order data from the Superstore dataset to assign to users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!imported ? (
          <>
            <p className="text-sm text-muted-foreground">
              This will import all orders from the Excel file into the database. 
              This is a one-time setup required before users can be assigned orders.
            </p>
            <Button 
              onClick={handleImport} 
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing... {progress}%
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Orders
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Orders imported successfully!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderImporter;