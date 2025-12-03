import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Assigning orders to user: ${user.id}`);

    // Check if user already has orders assigned
    const { data: existingOrders, error: checkError } = await supabaseClient
      .from('user_orders')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingOrders && existingOrders.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already has orders assigned',
          alreadyAssigned: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get 10 random unique orders
    const { data: allOrders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('id');

    if (ordersError) {
      throw ordersError;
    }

    if (!allOrders || allOrders.length === 0) {
      throw new Error('No orders available in the database');
    }

    // Shuffle and take 10 unique orders
    const shuffled = allOrders.sort(() => 0.5 - Math.random());
    const selectedOrders = shuffled.slice(0, Math.min(10, allOrders.length));

    // Create user_orders entries
    const userOrdersToInsert = selectedOrders.map(order => ({
      user_id: user.id,
      order_id: order.id
    }));

    const { error: insertError } = await supabaseClient
      .from('user_orders')
      .insert(userOrdersToInsert);

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully assigned ${selectedOrders.length} orders to user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully assigned ${selectedOrders.length} orders`,
        ordersAssigned: selectedOrders.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error assigning orders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});