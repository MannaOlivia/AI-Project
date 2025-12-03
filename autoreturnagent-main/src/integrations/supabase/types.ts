export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          brand: string | null
          category: string | null
          city: string | null
          cost: number | null
          country: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount_percent: number | null
          id: string
          order_date: string | null
          order_id: string
          product_id: string | null
          product_name: string | null
          profit: number | null
          quantity: number | null
          region: string | null
          sales: number | null
          segment: string | null
          ship_date: string | null
          ship_mode: string | null
          state: string | null
          sub_category: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          city?: string | null
          cost?: number | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_percent?: number | null
          id?: string
          order_date?: string | null
          order_id: string
          product_id?: string | null
          product_name?: string | null
          profit?: number | null
          quantity?: number | null
          region?: string | null
          sales?: number | null
          segment?: string | null
          ship_date?: string | null
          ship_mode?: string | null
          state?: string | null
          sub_category?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          city?: string | null
          cost?: number | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_percent?: number | null
          id?: string
          order_date?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          profit?: number | null
          quantity?: number | null
          region?: string | null
          sales?: number | null
          segment?: string | null
          ship_date?: string | null
          ship_mode?: string | null
          state?: string | null
          sub_category?: string | null
        }
        Relationships: []
      }
      return_decisions: {
        Row: {
          admin_notes: string | null
          ai_generated_image: boolean | null
          auto_email_draft: string | null
          confidence: number | null
          created_at: string
          decision: string
          decision_reason: string
          defect_category: string
          id: string
          is_google_image: boolean | null
          is_suspicious_image: boolean | null
          language: string | null
          manual_review_reason: string | null
          policy_matched_id: string | null
          processing_time_ms: number | null
          request_id: string
          vision_analysis: string
        }
        Insert: {
          admin_notes?: string | null
          ai_generated_image?: boolean | null
          auto_email_draft?: string | null
          confidence?: number | null
          created_at?: string
          decision: string
          decision_reason: string
          defect_category: string
          id?: string
          is_google_image?: boolean | null
          is_suspicious_image?: boolean | null
          language?: string | null
          manual_review_reason?: string | null
          policy_matched_id?: string | null
          processing_time_ms?: number | null
          request_id: string
          vision_analysis: string
        }
        Update: {
          admin_notes?: string | null
          ai_generated_image?: boolean | null
          auto_email_draft?: string | null
          confidence?: number | null
          created_at?: string
          decision?: string
          decision_reason?: string
          defect_category?: string
          id?: string
          is_google_image?: boolean | null
          is_suspicious_image?: boolean | null
          language?: string | null
          manual_review_reason?: string | null
          policy_matched_id?: string | null
          processing_time_ms?: number | null
          request_id?: string
          vision_analysis?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_decisions_policy_matched_id_fkey"
            columns: ["policy_matched_id"]
            isOneToOne: false
            referencedRelation: "return_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_policies: {
        Row: {
          conditions: string | null
          created_at: string
          defect_category: string
          id: string
          is_returnable: boolean
          policy_type: string
          time_limit_days: number | null
          updated_at: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string
          defect_category: string
          id?: string
          is_returnable?: boolean
          policy_type: string
          time_limit_days?: number | null
          updated_at?: string
        }
        Update: {
          conditions?: string | null
          created_at?: string
          defect_category?: string
          id?: string
          is_returnable?: boolean
          policy_type?: string
          time_limit_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          analysis_round: number | null
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          image_url: string | null
          issue_category: string | null
          issue_description: string
          language: string | null
          more_info_requested: boolean | null
          order_id: string | null
          original_image_url: string | null
          product_category: string | null
          product_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_round?: number | null
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          image_url?: string | null
          issue_category?: string | null
          issue_description: string
          language?: string | null
          more_info_requested?: boolean | null
          order_id?: string | null
          original_image_url?: string | null
          product_category?: string | null
          product_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_round?: number | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          image_url?: string | null
          issue_category?: string | null
          issue_description?: string
          language?: string | null
          more_info_requested?: boolean | null
          order_id?: string | null
          original_image_url?: string | null
          product_category?: string | null
          product_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_orders: {
        Row: {
          assigned_at: string | null
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
