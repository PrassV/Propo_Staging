export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agreement_cache: {
        Row: {
          cache_key: string
          content: string
          created_at: string | null
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          content: string
          created_at?: string | null
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          content?: string
          created_at?: string | null
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      agreement_templates: {
        Row: {
          agreement_type: string
          content: string
          created_at: string
          id: string
          is_default: boolean
          owner_id: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          agreement_type: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          owner_id?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          agreement_type?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          owner_id?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agreements: {
        Row: {
          agreement_type: string
          created_at: string
          deposit_amount: number | null
          document_url: string | null
          end_date: string | null
          id: string
          owner_id: string
          property_id: string
          rent_amount: number | null
          signed_landlord_at: string | null
          signed_tenant_at: string | null
          start_date: string
          status: string | null
          template_id: string | null
          tenant_id: string
          terms: string | null
          updated_at: string
        }
        Insert: {
          agreement_type: string
          created_at?: string
          deposit_amount?: number | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          owner_id: string
          property_id: string
          rent_amount?: number | null
          signed_landlord_at?: string | null
          signed_tenant_at?: string | null
          start_date: string
          status?: string | null
          template_id?: string | null
          tenant_id: string
          terms?: string | null
          updated_at?: string
        }
        Update: {
          agreement_type?: string
          created_at?: string
          deposit_amount?: number | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string
          property_id?: string
          rent_amount?: number | null
          signed_landlord_at?: string | null
          signed_tenant_at?: string | null
          start_date?: string
          status?: string | null
          template_id?: string | null
          tenant_id?: string
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agreements_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          document_name: string
          document_type: string | null
          file_extension: string | null
          file_size: number | null
          file_url: string
          id: string
          maintenance_request_id: string | null
          mime_type: string | null
          owner_id: string
          payment_id: string | null
          property_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_name: string
          document_type?: string | null
          file_extension?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          maintenance_request_id?: string | null
          mime_type?: string | null
          owner_id: string
          payment_id?: string | null
          property_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string | null
          file_extension?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          maintenance_request_id?: string | null
          mime_type?: string | null
          owner_id?: string
          payment_id?: string | null
          property_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          city: string
          country: string | null
          created_at: string
          description: string | null
          door_number: string | null
          floors: number | null
          garage_size: number | null
          garages: number | null
          id: string
          image_paths: string[] | null
          image_urls: string[] | null
          kitchens: number | null
          listed_in: string | null
          number_of_units: number | null
          owner_id: string
          pincode: string
          price: number | null
          property_name: string
          property_type: string | null
          size_sqft: number | null
          state: string
          status: string | null
          survey_number: string
          updated_at: string | null
          year_built: number | null
          yearly_tax_rate: number | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city: string
          country?: string | null
          created_at?: string
          description?: string | null
          door_number?: string | null
          floors?: number | null
          garage_size?: number | null
          garages?: number | null
          id?: string
          image_paths?: string[] | null
          image_urls?: string[] | null
          kitchens?: number | null
          listed_in?: string | null
          number_of_units?: number | null
          owner_id: string
          pincode: string
          price?: number | null
          property_name: string
          property_type?: string | null
          size_sqft?: number | null
          state: string
          status?: string | null
          survey_number: string
          updated_at?: string | null
          year_built?: number | null
          yearly_tax_rate?: number | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          city?: string
          country?: string | null
          created_at?: string
          description?: string | null
          door_number?: string | null
          floors?: number | null
          garage_size?: number | null
          garages?: number | null
          id?: string
          image_paths?: string[] | null
          image_urls?: string[] | null
          kitchens?: number | null
          listed_in?: string | null
          number_of_units?: number | null
          owner_id?: string
          pincode?: string
          price?: number | null
          property_name?: string
          property_type?: string | null
          size_sqft?: number | null
          state?: string
          status?: string | null
          survey_number?: string
          updated_at?: string | null
          year_built?: number | null
          yearly_tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          deposit: number | null
          id: string
          property_id: string
          rent: number | null
          status: string | null
          unit_number: string
          updated_at: string | null
        }
        Insert: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          deposit?: number | null
          id?: string
          property_id: string
          rent?: number | null
          status?: string | null
          unit_number: string
          updated_at?: string | null
        }
        Update: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          deposit?: number | null
          id?: string
          property_id?: string
          rent?: number | null
          status?: string | null
          unit_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          advance_amount: number | null
          created_at: string | null
          dob: string
          electricity_responsibility: string | null
          email: string
          family_size: number
          gender: string
          id: string
          id_number: string
          id_proof_url: string | null
          id_type: string
          lease_amount: number | null
          lease_end_date: string | null
          lease_start_date: string | null
          maintenance_fee: number | null
          name: string
          notice_period_days: number | null
          owner_id: string
          permanent_address: string
          phone: string
          property_tax_responsibility: string | null
          rental_amount: number | null
          rental_end_date: string | null
          rental_frequency: string | null
          rental_start_date: string | null
          rental_type: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          university: string | null
          updated_at: string | null
          user_id: string
          water_responsibility: string | null
        }
        Insert: {
          advance_amount?: number | null
          created_at?: string | null
          dob: string
          electricity_responsibility?: string | null
          email: string
          family_size: number
          gender: string
          id?: string
          id_number: string
          id_proof_url?: string | null
          id_type: string
          lease_amount?: number | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          maintenance_fee?: number | null
          name: string
          notice_period_days?: number | null
          owner_id: string
          permanent_address: string
          phone: string
          property_tax_responsibility?: string | null
          rental_amount?: number | null
          rental_end_date?: string | null
          rental_frequency?: string | null
          rental_start_date?: string | null
          rental_type?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          university?: string | null
          updated_at?: string | null
          user_id: string
          water_responsibility?: string | null
        }
        Update: {
          advance_amount?: number | null
          created_at?: string | null
          dob?: string
          electricity_responsibility?: string | null
          email?: string
          family_size?: number
          gender?: string
          id?: string
          id_number?: string
          id_proof_url?: string | null
          id_type?: string
          lease_amount?: number | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          maintenance_fee?: number | null
          name?: string
          notice_period_days?: number | null
          owner_id?: string
          permanent_address?: string
          phone?: string
          property_tax_responsibility?: string | null
          rental_amount?: number | null
          rental_end_date?: string | null
          rental_frequency?: string | null
          rental_start_date?: string | null
          rental_type?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          university?: string | null
          updated_at?: string | null
          user_id?: string
          water_responsibility?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_paid: number | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          lease_id: string
          owner_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          period_end_date: string | null
          period_start_date: string | null
          property_id: string
          receipt_url: string | null
          status: string | null
          tenant_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          lease_id: string
          owner_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          period_end_date?: string | null
          period_start_date?: string | null
          property_id: string
          receipt_url?: string | null
          status?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          lease_id?: string
          owner_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          period_end_date?: string | null
          period_start_date?: string | null
          property_id?: string
          receipt_url?: string | null
          status?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_vendor_id: string | null
          category: string
          created_at: string | null
          created_by: string
          created_by_profile: string | null
          description: string
          estimated_cost: number | null
          id: string
          priority: string
          property_id: string
          status: string
          tenant_id: string | null
          title: string
          unit_id: string
          unit_number: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_vendor_id?: string | null
          category: string
          created_at?: string | null
          created_by: string
          created_by_profile?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          priority: string
          property_id: string
          status?: string
          tenant_id?: string | null
          title: string
          unit_id: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_vendor_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string
          created_by_profile?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          priority?: string
          property_id?: string
          status?: string
          tenant_id?: string | null
          title?: string
          unit_id?: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_created_by_profile_fkey"
            columns: ["created_by_profile"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          categories: Json | null
          company_name: string
          completed_jobs: number
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          rating: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          categories?: Json | null
          company_name: string
          completed_jobs?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          categories?: Json | null
          company_name?: string
          completed_jobs?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          id_image_url: string | null
          id_type: string | null
          last_name: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          id_image_url?: string | null
          id_type?: string | null
          last_name?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          id_image_url?: string | null
          id_type?: string | null
          last_name?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_summary: {
        Row: {
          monthly_rental_income: number | null
          occupancy_rate: number | null
          owner_id: string | null
          total_lease_value: number | null
          total_maintenance_income: number | null
          total_properties: number | null
          total_rented_properties: number | null
          total_security_deposits: number | null
          total_tenants: number | null
          total_units: number | null
          total_vacant_properties: number | null
          yearly_rental_income: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_agreements: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_my_property: {
        Args: { propert_data_arg: Json }
        Returns: Json
      }
      update_storage_object_owner: {
        Args: { p_object_id: string; p_new_owner_id: string }
        Returns: undefined
      }
    }
    Enums: {
      property_type:
        | "residential"
        | "commercial"
        | "vacant_land"
        | "other"
        | "hostel_pg"
      tenant_status: "active" | "unassigned" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      property_type: [
        "residential",
        "commercial",
        "vacant_land",
        "other",
        "hostel_pg",
      ],
      tenant_status: ["active", "unassigned", "inactive"],
    },
  },
} as const

// Convenience types for common use cases
export type Property = Tables<"properties">
export type PropertyInsert = TablesInsert<"properties">
export type PropertyUpdate = TablesUpdate<"properties">

export type Unit = Tables<"units">
export type UnitInsert = TablesInsert<"units">
export type UnitUpdate = TablesUpdate<"units">

export type Tenant = Tables<"tenants">
export type TenantInsert = TablesInsert<"tenants">
export type TenantUpdate = TablesUpdate<"tenants">

export type Payment = Tables<"payments">
export type PaymentInsert = TablesInsert<"payments">
export type PaymentUpdate = TablesUpdate<"payments">

export type MaintenanceRequest = Tables<"maintenance_requests">
export type MaintenanceRequestInsert = TablesInsert<"maintenance_requests">
export type MaintenanceRequestUpdate = TablesUpdate<"maintenance_requests">

export type Document = Tables<"documents">
export type DocumentInsert = TablesInsert<"documents">
export type DocumentUpdate = TablesUpdate<"documents">

export type Agreement = Tables<"agreements">
export type AgreementInsert = TablesInsert<"agreements">
export type AgreementUpdate = TablesUpdate<"agreements">

export type Vendor = Tables<"vendors">
export type VendorInsert = TablesInsert<"vendors">
export type VendorUpdate = TablesUpdate<"vendors">

export type UserProfile = Tables<"user_profiles">
export type UserProfileInsert = TablesInsert<"user_profiles">
export type UserProfileUpdate = TablesUpdate<"user_profiles">

export type DashboardSummary = Tables<"dashboard_summary">

// Enums for type safety
export type PropertyType = Enums<"property_type">
export type TenantStatus = Enums<"tenant_status"> 