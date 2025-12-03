import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRow {
  'Order ID': string;
  'Order Date': string;
  'Ship Date': string;
  'Ship Mode': string;
  'Customer ID': string;
  'Customer Name': string;
  'Segment': string;
  'Country': string;
  'City': string;
  'State': string;
  'Region': string;
  'Product ID': string;
  'Category': string;
  'Sub-Category': string;
  'Product Name': string;
  'Sales': number;
  'Quantity': number;
  'Profit': number;
  'Brand': string;
  'Discount %': number;
  'Cost': number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orders } = await req.json() as { orders: OrderRow[] };

    console.log(`Importing ${orders.length} orders...`);

    // Transform data - each row is a unique line item
    const ordersToInsert = orders.map((row, index) => ({
      order_id: `${row['Order ID']}-${index}`, // Make unique by adding index
      order_date: row['Order Date'] ? new Date(row['Order Date']).toISOString() : null,
      ship_date: row['Ship Date'] ? new Date(row['Ship Date']).toISOString() : null,
      ship_mode: row['Ship Mode'],
      customer_id: row['Customer ID'],
      customer_name: row['Customer Name'],
      segment: row['Segment'],
      country: row['Country'],
      city: row['City'],
      state: row['State'],
      region: row['Region'],
      product_id: row['Product ID'],
      category: row['Category'],
      sub_category: row['Sub-Category'],
      product_name: row['Product Name'],
      sales: row['Sales'],
      quantity: row['Quantity'],
      profit: row['Profit'],
      brand: row['Brand'],
      discount_percent: row['Discount %'],
      cost: row['Cost'],
    }));

    // Insert in batches of 500 to avoid timeouts
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < ordersToInsert.length; i += batchSize) {
      const batch = ordersToInsert.slice(i, i + batchSize);
      const { error } = await supabaseClient
        .from('orders')
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }

      totalInserted += batch.length;
      console.log(`Inserted ${totalInserted}/${ordersToInsert.length} orders`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${totalInserted} orders`,
        total: totalInserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing orders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});