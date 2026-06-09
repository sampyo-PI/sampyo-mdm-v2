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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _backup_attributes_20260416: {
        Row: {
          code: string | null
          created_at: string | null
          data_type: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_required: boolean | null
          name: string | null
          options: Json | null
          sort_order: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string | null
          options?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string | null
          options?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_cam_20260416: {
        Row: {
          attribute_id: string | null
          created_at: string | null
          id: string | null
          include_in_name: boolean | null
          small_category_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          include_in_name?: boolean | null
          small_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          include_in_name?: boolean | null
          small_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_cam_20260418: {
        Row: {
          attribute_id: string | null
          created_at: string | null
          id: string | null
          include_in_name: boolean | null
          small_category_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          include_in_name?: boolean | null
          small_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          include_in_name?: boolean | null
          small_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_large_code_remap_v5_20260514: {
        Row: {
          code: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_medium_code_remap_20260512: {
        Row: {
          code: string | null
          id: string | null
          large_category_id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          large_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          large_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_medium_code_remap_v5_20260514: {
        Row: {
          code: string | null
          id: string | null
          large_category_id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          large_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          large_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_small_20260418: {
        Row: {
          code: string | null
          created_at: string | null
          default_item_account_code: string | null
          default_item_class_code: string | null
          default_stock_unit_code: string | null
          description: string | null
          id: string | null
          medium_category_id: string | null
          name: string | null
          name_template: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          default_item_account_code?: string | null
          default_item_class_code?: string | null
          default_stock_unit_code?: string | null
          description?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          name_template?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          default_item_account_code?: string | null
          default_item_class_code?: string | null
          default_stock_unit_code?: string | null
          description?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          name_template?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_small_code_remap_20260512: {
        Row: {
          code: string | null
          id: string | null
          medium_category_id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_category_small_code_remap_v5_20260514: {
        Row: {
          code: string | null
          id: string | null
          medium_category_id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          medium_category_id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_erp_interface_items_code_remap_20260512: {
        Row: {
          created_at: string | null
          id: string | null
          interface_status: string | null
          item_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          interface_status?: string | null
          item_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          interface_status?: string | null
          item_code?: string | null
        }
        Relationships: []
      }
      _backup_erp_interface_items_code_remap_v5_20260514: {
        Row: {
          created_at: string | null
          id: string | null
          interface_status: string | null
          item_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          interface_status?: string | null
          item_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          interface_status?: string | null
          item_code?: string | null
        }
        Relationships: []
      }
      _backup_item_requests_code_remap_20260512: {
        Row: {
          id: string | null
          item_code: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          item_code?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          item_code?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_item_requests_code_remap_v5_20260514: {
        Row: {
          id: string | null
          item_code: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          item_code?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          item_code?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_item_variants_code_remap_20260512: {
        Row: {
          base_code: string | null
          created_at: string | null
          id: string | null
          variant_code: string | null
        }
        Insert: {
          base_code?: string | null
          created_at?: string | null
          id?: string | null
          variant_code?: string | null
        }
        Update: {
          base_code?: string | null
          created_at?: string | null
          id?: string | null
          variant_code?: string | null
        }
        Relationships: []
      }
      _backup_item_variants_code_remap_v5_20260514: {
        Row: {
          base_code: string | null
          created_at: string | null
          id: string | null
          variant_code: string | null
        }
        Insert: {
          base_code?: string | null
          created_at?: string | null
          id?: string | null
          variant_code?: string | null
        }
        Update: {
          base_code?: string | null
          created_at?: string | null
          id?: string | null
          variant_code?: string | null
        }
        Relationships: []
      }
      _backup_items_code_remap_20260512: {
        Row: {
          base_code: string | null
          id: string | null
          item_code: string | null
          item_code_display: string | null
          updated_at: string | null
          variant_code: string | null
        }
        Insert: {
          base_code?: string | null
          id?: string | null
          item_code?: string | null
          item_code_display?: string | null
          updated_at?: string | null
          variant_code?: string | null
        }
        Update: {
          base_code?: string | null
          id?: string | null
          item_code?: string | null
          item_code_display?: string | null
          updated_at?: string | null
          variant_code?: string | null
        }
        Relationships: []
      }
      _backup_items_code_remap_v5_20260514: {
        Row: {
          base_code: string | null
          id: string | null
          item_code: string | null
          item_code_display: string | null
          updated_at: string | null
          variant_code: string | null
        }
        Insert: {
          base_code?: string | null
          id?: string | null
          item_code?: string | null
          item_code_display?: string | null
          updated_at?: string | null
          variant_code?: string | null
        }
        Update: {
          base_code?: string | null
          id?: string | null
          item_code?: string | null
          item_code_display?: string | null
          updated_at?: string | null
          variant_code?: string | null
        }
        Relationships: []
      }
      _backup_items_norm_20260418: {
        Row: {
          id: string | null
          item_code: string | null
          normalized_name: string | null
          small_category: string | null
        }
        Insert: {
          id?: string | null
          item_code?: string | null
          normalized_name?: string | null
          small_category?: string | null
        }
        Update: {
          id?: string | null
          item_code?: string | null
          normalized_name?: string | null
          small_category?: string | null
        }
        Relationships: []
      }
      ai_reviews: {
        Row: {
          agent_version: string
          checks: Json
          created_at: string
          decision: string
          duration_ms: number | null
          id: string
          model_name: string
          prompt_hash: string
          reasons: string[] | null
          request_id: string
          score_overall: number | null
        }
        Insert: {
          agent_version: string
          checks?: Json
          created_at?: string
          decision: string
          duration_ms?: number | null
          id?: string
          model_name: string
          prompt_hash: string
          reasons?: string[] | null
          request_id: string
          score_overall?: number | null
        }
        Update: {
          agent_version?: string
          checks?: Json
          created_at?: string
          decision?: string
          duration_ms?: number | null
          id?: string
          model_name?: string
          prompt_hash?: string
          reasons?: string[] | null
          request_id?: string
          score_overall?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string
          function_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          code: string
          created_at: string
          data_type: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          options: Json | null
          sort_order: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          options?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          options?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      business_units: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attribute_mappings: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          include_in_name: boolean
          small_category_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          include_in_name?: boolean
          small_category_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          include_in_name?: boolean
          small_category_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_attribute_mappings_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attribute_mappings_small_category_id_fkey"
            columns: ["small_category_id"]
            isOneToOne: false
            referencedRelation: "category_small"
            referencedColumns: ["id"]
          },
        ]
      }
      category_field_terms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          small_category_id: string
          sort_order: number | null
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          small_category_id: string
          sort_order?: number | null
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          small_category_id?: string
          sort_order?: number | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_field_terms_small_category_id_fkey"
            columns: ["small_category_id"]
            isOneToOne: false
            referencedRelation: "category_small"
            referencedColumns: ["id"]
          },
        ]
      }
      category_large: {
        Row: {
          code: string
          created_at: string
          description: string | null
          english_name: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          english_name?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          english_name?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      category_medium: {
        Row: {
          code: string
          created_at: string
          description: string | null
          english_name: string | null
          id: string
          large_category_id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          english_name?: string | null
          id?: string
          large_category_id: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          english_name?: string | null
          id?: string
          large_category_id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_medium_large_category_id_fkey"
            columns: ["large_category_id"]
            isOneToOne: false
            referencedRelation: "category_large"
            referencedColumns: ["id"]
          },
        ]
      }
      category_small: {
        Row: {
          code: string
          created_at: string
          default_item_account_code: string | null
          default_item_class_code: string | null
          default_stock_unit_code: string | null
          description: string | null
          english_name: string | null
          id: string
          medium_category_id: string
          name: string
          name_template: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_item_account_code?: string | null
          default_item_class_code?: string | null
          default_stock_unit_code?: string | null
          description?: string | null
          english_name?: string | null
          id?: string
          medium_category_id: string
          name: string
          name_template?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_item_account_code?: string | null
          default_item_class_code?: string | null
          default_stock_unit_code?: string | null
          description?: string | null
          english_name?: string | null
          id?: string
          medium_category_id?: string
          name?: string
          name_template?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_small_medium_category_id_fkey"
            columns: ["medium_category_id"]
            isOneToOne: false
            referencedRelation: "category_medium"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          series_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          series_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          series_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "company_series"
            referencedColumns: ["id"]
          },
        ]
      }
      company_series: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      default_reviewers: {
        Row: {
          ai_review_enabled: boolean
          company_id: string | null
          created_at: string
          id: string
          is_fallback: boolean
          note: string | null
          reviewer_2_teams: string[]
          reviewer_3_teams: string[]
          series_id: string | null
          updated_at: string
        }
        Insert: {
          ai_review_enabled?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          is_fallback?: boolean
          note?: string | null
          reviewer_2_teams?: string[]
          reviewer_3_teams?: string[]
          series_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_review_enabled?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          is_fallback?: boolean
          note?: string | null
          reviewer_2_teams?: string[]
          reviewer_3_teams?: string[]
          series_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_reviewers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "default_reviewers_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "company_series"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number | null
          source: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          site_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          site_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          site_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_basic_units_by_company: {
        Row: {
          code: string
          created_at: string
          gdb_cd: string
          id: string
          is_active: boolean
          name: string
          unit_class: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          gdb_cd: string
          id?: string
          is_active?: boolean
          name: string
          unit_class?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          gdb_cd?: string
          id?: string
          is_active?: boolean
          name?: string
          unit_class?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_company_category_defaults: {
        Row: {
          company_code: string
          created_at: string | null
          id: string
          item_account_code: string | null
          item_account_name: string | null
          small_category_id: string
          updated_at: string | null
        }
        Insert: {
          company_code: string
          created_at?: string | null
          id?: string
          item_account_code?: string | null
          item_account_name?: string | null
          small_category_id: string
          updated_at?: string | null
        }
        Update: {
          company_code?: string
          created_at?: string | null
          id?: string
          item_account_code?: string | null
          item_account_name?: string | null
          small_category_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_company_category_defaults_small_category_id_fkey"
            columns: ["small_category_id"]
            isOneToOne: false
            referencedRelation: "category_small"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_interface_items: {
        Row: {
          attributes: Json | null
          created_at: string
          equipment_name: string | null
          error_message: string | null
          id: string
          interface_action: string
          interface_status: string
          item_code: string
          item_name: string
          item_request_id: string | null
          large_category: string | null
          maker: string | null
          medium_category: string | null
          model: string | null
          normalized_name: string | null
          processed_at: string | null
          retry_count: number | null
          small_category: string | null
          spec: string | null
          target_erp: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          equipment_name?: string | null
          error_message?: string | null
          id?: string
          interface_action?: string
          interface_status?: string
          item_code: string
          item_name: string
          item_request_id?: string | null
          large_category?: string | null
          maker?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          processed_at?: string | null
          retry_count?: number | null
          small_category?: string | null
          spec?: string | null
          target_erp: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          equipment_name?: string | null
          error_message?: string | null
          id?: string
          interface_action?: string
          interface_status?: string
          item_code?: string
          item_name?: string
          item_request_id?: string | null
          large_category?: string | null
          maker?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          processed_at?: string | null
          retry_count?: number | null
          small_category?: string | null
          spec?: string | null
          target_erp?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_interface_items_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_item_accounts: {
        Row: {
          account_code: string
          account_name: string
          company_code: string
          created_at: string | null
          id: string
        }
        Insert: {
          account_code: string
          account_name: string
          company_code: string
          created_at?: string | null
          id?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          company_code?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      erp_item_classes: {
        Row: {
          class_code: string
          class_name: string
          created_at: string | null
          id: string
        }
        Insert: {
          class_code: string
          class_name: string
          created_at?: string | null
          id?: string
        }
        Update: {
          class_code?: string
          class_name?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      item_code_sequences: {
        Row: {
          created_at: string
          current_serial: number
          id: string
          large_category: string
          medium_category: string
          small_category: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_serial?: number
          id?: string
          large_category: string
          medium_category: string
          small_category: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_serial?: number
          id?: string
          large_category?: string
          medium_category?: string
          small_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      item_companies: {
        Row: {
          added_at: string
          added_by: string | null
          company_id: string
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          is_active: boolean
          item_account_code: string | null
          item_class_code: string | null
          item_id: string
          note: string | null
          source: string
          stock_unit_code: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          company_id: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean
          item_account_code?: string | null
          item_class_code?: string | null
          item_id: string
          note?: string | null
          source?: string
          stock_unit_code?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          company_id?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean
          item_account_code?: string | null
          item_class_code?: string | null
          item_id?: string
          note?: string | null
          source?: string
          stock_unit_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_companies_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_organizations: {
        Row: {
          company_id: string | null
          created_at: string
          equipment_name: string | null
          id: string
          item_request_id: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          equipment_name?: string | null
          id?: string
          item_request_id: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          equipment_name?: string | null
          id?: string
          item_request_id?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_organizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_organizations_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_organizations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      item_recheck_results: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          applied_batch_commit_id: string | null
          batch_id: string
          cost_usd: number | null
          created_at: string
          duplicate_check: Json | null
          duration_ms: number | null
          errors: Json | null
          id: string
          item_code: string
          pipeline_version: string
          raw_responses: Json | null
          stage1_confidence: number | null
          stage1_is_oop: boolean | null
          stage1_large: string | null
          stage1_medium: string | null
          stage1_pool_gap_reason: string | null
          stage1_second_confidence: number | null
          stage1_second_small: string | null
          stage1_small: string | null
          stage1_used_sonnet: boolean | null
          stage2_attributes: Json | null
          stage2_new_values: Json | null
          stage2_pool_compliance: number | null
          stage3_equipment: string | null
          stage3_maker: string | null
          stage3_maker_confidence: number | null
          stage3_model: string | null
          stage3_model_confidence: number | null
          stage4_normalized_name: string | null
          tier: string | null
          tier_reason: string | null
          updated_at: string
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          applied_batch_commit_id?: string | null
          batch_id: string
          cost_usd?: number | null
          created_at?: string
          duplicate_check?: Json | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          item_code: string
          pipeline_version: string
          raw_responses?: Json | null
          stage1_confidence?: number | null
          stage1_is_oop?: boolean | null
          stage1_large?: string | null
          stage1_medium?: string | null
          stage1_pool_gap_reason?: string | null
          stage1_second_confidence?: number | null
          stage1_second_small?: string | null
          stage1_small?: string | null
          stage1_used_sonnet?: boolean | null
          stage2_attributes?: Json | null
          stage2_new_values?: Json | null
          stage2_pool_compliance?: number | null
          stage3_equipment?: string | null
          stage3_maker?: string | null
          stage3_maker_confidence?: number | null
          stage3_model?: string | null
          stage3_model_confidence?: number | null
          stage4_normalized_name?: string | null
          tier?: string | null
          tier_reason?: string | null
          updated_at?: string
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          applied_batch_commit_id?: string | null
          batch_id?: string
          cost_usd?: number | null
          created_at?: string
          duplicate_check?: Json | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          item_code?: string
          pipeline_version?: string
          raw_responses?: Json | null
          stage1_confidence?: number | null
          stage1_is_oop?: boolean | null
          stage1_large?: string | null
          stage1_medium?: string | null
          stage1_pool_gap_reason?: string | null
          stage1_second_confidence?: number | null
          stage1_second_small?: string | null
          stage1_small?: string | null
          stage1_used_sonnet?: boolean | null
          stage2_attributes?: Json | null
          stage2_new_values?: Json | null
          stage2_pool_compliance?: number | null
          stage3_equipment?: string | null
          stage3_maker?: string | null
          stage3_maker_confidence?: number | null
          stage3_model?: string | null
          stage3_model_confidence?: number | null
          stage4_normalized_name?: string | null
          tier?: string | null
          tier_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      item_requests: {
        Row: {
          ai_escalated_count: number
          ai_rejected_count: number
          appeal_note: string | null
          appeal_resolved_by: string | null
          appealed_at: string | null
          attributes: Json | null
          category: string | null
          category_confidence: number | null
          company_id: string | null
          created_at: string
          document_urls: Json | null
          duplicate_risk_reason: string | null
          duplicate_risk_score: number | null
          equipment_name: string | null
          escalated_by: string | null
          escalated_to_requester_at: string | null
          escalation_reason: string | null
          id: string
          image_urls: Json | null
          item_account_code: string | null
          item_class_code: string | null
          item_code: string | null
          item_name: string
          large_category: string | null
          latest_ai_review_id: string | null
          maker: string | null
          medium_category: string | null
          model: string | null
          normalized_name: string | null
          notes: string | null
          parent_item_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          request_number: string
          requester_id: string | null
          review_1_at: string | null
          review_1_comment: string | null
          review_2_at: string | null
          review_2_comment: string | null
          review_3_at: string | null
          review_3_comment: string | null
          reviewer_1_id: string | null
          reviewer_2_id: string | null
          reviewer_2_processed_by: string | null
          reviewer_3_id: string | null
          reviewer_3_processed_by: string | null
          site_id: string | null
          small_category: string | null
          spec: string | null
          status: Database["public"]["Enums"]["request_status"]
          stock_unit_code: string | null
          unit: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ai_escalated_count?: number
          ai_rejected_count?: number
          appeal_note?: string | null
          appeal_resolved_by?: string | null
          appealed_at?: string | null
          attributes?: Json | null
          category?: string | null
          category_confidence?: number | null
          company_id?: string | null
          created_at?: string
          document_urls?: Json | null
          duplicate_risk_reason?: string | null
          duplicate_risk_score?: number | null
          equipment_name?: string | null
          escalated_by?: string | null
          escalated_to_requester_at?: string | null
          escalation_reason?: string | null
          id?: string
          image_urls?: Json | null
          item_account_code?: string | null
          item_class_code?: string | null
          item_code?: string | null
          item_name: string
          large_category?: string | null
          latest_ai_review_id?: string | null
          maker?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          notes?: string | null
          parent_item_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number: string
          requester_id?: string | null
          review_1_at?: string | null
          review_1_comment?: string | null
          review_2_at?: string | null
          review_2_comment?: string | null
          review_3_at?: string | null
          review_3_comment?: string | null
          reviewer_1_id?: string | null
          reviewer_2_id?: string | null
          reviewer_2_processed_by?: string | null
          reviewer_3_id?: string | null
          reviewer_3_processed_by?: string | null
          site_id?: string | null
          small_category?: string | null
          spec?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          stock_unit_code?: string | null
          unit?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ai_escalated_count?: number
          ai_rejected_count?: number
          appeal_note?: string | null
          appeal_resolved_by?: string | null
          appealed_at?: string | null
          attributes?: Json | null
          category?: string | null
          category_confidence?: number | null
          company_id?: string | null
          created_at?: string
          document_urls?: Json | null
          duplicate_risk_reason?: string | null
          duplicate_risk_score?: number | null
          equipment_name?: string | null
          escalated_by?: string | null
          escalated_to_requester_at?: string | null
          escalation_reason?: string | null
          id?: string
          image_urls?: Json | null
          item_account_code?: string | null
          item_class_code?: string | null
          item_code?: string | null
          item_name?: string
          large_category?: string | null
          latest_ai_review_id?: string | null
          maker?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          notes?: string | null
          parent_item_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number?: string
          requester_id?: string | null
          review_1_at?: string | null
          review_1_comment?: string | null
          review_2_at?: string | null
          review_2_comment?: string | null
          review_3_at?: string | null
          review_3_comment?: string | null
          reviewer_1_id?: string | null
          reviewer_2_id?: string | null
          reviewer_2_processed_by?: string | null
          reviewer_3_id?: string | null
          reviewer_3_processed_by?: string | null
          site_id?: string | null
          small_category?: string | null
          spec?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          stock_unit_code?: string | null
          unit?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_latest_ai_review_id_fkey"
            columns: ["latest_ai_review_id"]
            isOneToOne: false
            referencedRelation: "ai_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          base_code: string
          created_at: string
          equipment_name: string | null
          id: string
          item_request_id: string | null
          maker: string | null
          model: string | null
          parent_item_id: string | null
          small_category: string | null
          variant_code: string
        }
        Insert: {
          base_code: string
          created_at?: string
          equipment_name?: string | null
          id?: string
          item_request_id?: string | null
          maker?: string | null
          model?: string | null
          parent_item_id?: string | null
          small_category?: string | null
          variant_code: string
        }
        Update: {
          base_code?: string
          created_at?: string
          equipment_name?: string | null
          id?: string
          item_request_id?: string | null
          maker?: string | null
          model?: string | null
          parent_item_id?: string | null
          small_category?: string | null
          variant_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_variants_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          additional_info: string | null
          attributes: Json | null
          base_code: string | null
          created_at: string | null
          equipment: string | null
          id: string
          needs_review: boolean
          sub_type: string | null
          is_active: boolean
          item_account_code: string | null
          item_account_name: string | null
          item_class_code: string | null
          item_class_name: string | null
          item_code: string
          item_code_display: string | null
          item_name: string
          item_request_id: string | null
          large_category: string | null
          legacy_code: string | null
          legacy_code_aliases: string[]
          maker: string | null
          maker_suffix: string | null
          medium_category: string | null
          model: string | null
          normalized_name: string | null
          original_sort_order: number | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          serial_number: string | null
          small_category: string | null
          source: string
          spec: string | null
          stock_unit_code: string | null
          updated_at: string | null
          upload_batch_id: string | null
          variant_code: string | null
          version: number
        }
        Insert: {
          attributes?: Json | null
          base_code?: string | null
          created_at?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          item_account_code?: string | null
          item_account_name?: string | null
          item_class_code?: string | null
          item_class_name?: string | null
          item_code: string
          item_code_display?: string | null
          item_name: string
          item_request_id?: string | null
          large_category?: string | null
          legacy_code?: string | null
          legacy_code_aliases?: string[]
          maker?: string | null
          maker_suffix?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          original_sort_order?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          serial_number?: string | null
          small_category?: string | null
          source?: string
          spec?: string | null
          stock_unit_code?: string | null
          updated_at?: string | null
          upload_batch_id?: string | null
          variant_code?: string | null
          version?: number
        }
        Update: {
          attributes?: Json | null
          base_code?: string | null
          created_at?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          item_account_code?: string | null
          item_account_name?: string | null
          item_class_code?: string | null
          item_class_name?: string | null
          item_code?: string
          item_code_display?: string | null
          item_name?: string
          item_request_id?: string | null
          large_category?: string | null
          legacy_code?: string | null
          legacy_code_aliases?: string[]
          maker?: string | null
          maker_suffix?: string | null
          medium_category?: string | null
          model?: string | null
          normalized_name?: string | null
          original_sort_order?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          serial_number?: string | null
          small_category?: string | null
          source?: string
          spec?: string | null
          stock_unit_code?: string | null
          updated_at?: string | null
          upload_batch_id?: string | null
          variant_code?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      makers: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_user_roles: {
        Row: {
          company_id: string | null
          consumed_at: string | null
          consumed_user_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          display_name: string | null
          email: string
          emp_no: string | null
          id: string
          note: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          company_id?: string | null
          consumed_at?: string | null
          consumed_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_name?: string | null
          email: string
          emp_no?: string | null
          id?: string
          note?: string | null
          position?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          company_id?: string | null
          consumed_at?: string | null
          consumed_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          display_name?: string | null
          email?: string
          emp_no?: string | null
          id?: string
          note?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pending_user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          company_id: string | null
          created_at: string
          department: string | null
          department_id: string | null
          display_name: string
          email: string | null
          emp_no: string | null
          id: string
          position: string | null
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          display_name: string
          email?: string | null
          emp_no?: string | null
          id?: string
          position?: string | null
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          display_name?: string
          email?: string | null
          emp_no?: string | null
          id?: string
          position?: string | null
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      qna_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qna_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "qna_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      qna_posts: {
        Row: {
          author_user_id: string
          body: string
          category: string
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          category: string
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          category?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_change_logs: {
        Row: {
          created_at: string
          field_name: string
          id: string
          item_request_id: string
          new_value: string | null
          old_value: string | null
          review_step: number
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          item_request_id: string
          new_value?: string | null
          old_value?: string | null
          review_step: number
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          item_request_id?: string
          new_value?: string | null
          old_value?: string | null
          review_step?: number
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_change_logs_item_request_id_fkey"
            columns: ["item_request_id"]
            isOneToOne: false
            referencedRelation: "item_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          business_unit_code: string | null
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          business_unit_code?: string | null
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          business_unit_code?: string | null
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      target_erp_systems: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      upload_batches: {
        Row: {
          display_label: string | null
          error_count: number
          file_name: string | null
          id: string
          note: string | null
          row_count: number
          source: string
          success_count: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          display_label?: string | null
          error_count?: number
          file_name?: string | null
          id?: string
          note?: string | null
          row_count?: number
          source?: string
          success_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          display_label?: string | null
          error_count?: number
          file_name?: string | null
          id?: string
          note?: string | null
          row_count?: number
          source?: string
          success_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_name_template: {
        Args: {
          p_attribute_definitions?: Json
          p_attributes?: Json
          p_equipment_name?: string
          p_maker?: string
          p_model?: string
          p_small_name: string
          p_spec?: string
          p_template: string
        }
        Returns: string
      }
      apply_pending_user_roles: {
        Args: { p_email: string; p_user_id: string }
        Returns: {
          applied_count: number
          applied_roles: Json
        }[]
      }
      check_item_duplicate: {
        Args: {
          p_attributes?: Json
          p_exclude_item_id?: string
          p_maker?: string
          p_model: string
          p_normalized_name: string
          p_small_category: string
          p_spec?: string
        }
        Returns: {
          item_code: string
          item_id: string
          item_name: string
          maker: string
          match_type: string
          model: string
          normalized_name: string
          severity: number
          variant_candidate: boolean
        }[]
      }
      compute_normalized_name_for: {
        Args: {
          p_attributes: Json
          p_equipment_name: string
          p_maker: string
          p_model: string
          p_small_category_id: string
          p_spec: string
        }
        Returns: string
      }
      distribute_item_to_company: {
        Args: {
          p_item_account_code?: string
          p_item_class_code?: string
          p_item_code: string
          p_note?: string
          p_skip_erp?: boolean
          p_source?: string
          p_stock_unit_code?: string
          p_target_company_code: string
        }
        Returns: Json
      }
      escalate_to_requester: {
        Args: {
          p_expected_version?: number
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      generate_item_code: {
        Args: {
          p_equipment_name?: string
          p_large_category: string
          p_maker?: string
          p_medium_category: string
          p_model?: string
          p_parent_item_id?: string
          p_request_id?: string
          p_small_category: string
        }
        Returns: string
      }
      generate_normalized_name: {
        Args: { p_attributes: Json; p_small_category: string }
        Returns: string
      }
      get_ai_quality_metrics: { Args: never; Returns: Json }
      get_ai_shadow_metrics: { Args: { p_days?: number }; Returns: Json }
      get_ai_usage_summary: { Args: { p_days?: number }; Returns: Json }
      get_all_attribute_usage_summary: {
        Args: never
        Returns: {
          attribute_name: string
          distinct_count: number
          total_usage: number
        }[]
      }
      get_attribute_usage: {
        Args: { p_attribute_name: string }
        Returns: {
          percentage: number
          usage_count: number
          value: string
        }[]
      }
      get_category_attribute_values_map: {
        Args: {
          p_min_usage?: number
          p_top_categories?: number
          p_top_values_per_attr?: number
        }
        Returns: {
          attr_name: string
          attr_values: string[]
          small_category: string
        }[]
      }
      get_category_attribute_values_map_json: {
        Args: {
          p_min_usage?: number
          p_top_categories?: number
          p_top_values_per_attr?: number
        }
        Returns: Json
      }
      get_category_erp_defaults: {
        Args: { p_small_category_name: string }
        Returns: {
          item_account_code: string
          item_class_code: string
          stock_unit_code: string
        }[]
      }
      get_category_overview: { Args: never; Returns: Json }
      get_company_account_code: {
        Args: { p_company_code: string; p_small_category_name: string }
        Returns: {
          item_account_code: string
          item_account_name: string
        }[]
      }
      get_company_mapping_stats: {
        Args: never
        Returns: {
          company_code: string
          mapped_count: number
          total_categories: number
          unmapped_count: number
        }[]
      }
      get_distinct_departments: {
        Args: never
        Returns: {
          department: string
          member_count: number
        }[]
      }
      get_high_dup_requests: {
        Args: { p_limit?: number }
        Returns: {
          category_confidence: number
          created_at: string
          duplicate_risk_reason: string
          duplicate_risk_score: number
          id: string
          item_name: string
          normalized_name: string
          request_number: string
          small_category: string
          status: string
        }[]
      }
      get_item_variants: {
        Args: { p_item_id: string }
        Returns: {
          created_at: string
          is_self: boolean
          item_code: string
          item_id: string
          item_name: string
          maker: string
          model: string
          normalized_name: string
          variant_code: string
        }[]
      }
      get_items_by_company: {
        Args: never
        Returns: {
          cnt: number
          company_code: string
          company_id: string
          company_name: string
        }[]
      }
      get_items_by_large_category: {
        Args: never
        Returns: {
          cnt: number
          large_category: string
        }[]
      }
      get_items_daily_changes: {
        Args: { p_from: string; p_to: string }
        Returns: {
          created_cnt: number
          day: string
          revoked_cnt: number
        }[]
      }
      get_low_confidence_requests: {
        Args: { p_limit?: number }
        Returns: {
          category_confidence: number
          created_at: string
          duplicate_risk_score: number
          id: string
          item_name: string
          normalized_name: string
          request_number: string
          small_category: string
          status: string
        }[]
      }
      get_qna_post_comment_counts: {
        Args: { p_post_ids: string[] }
        Returns: {
          comment_count: number
          post_id: string
        }[]
      }
      get_request_drilldown_stats: {
        Args: { p_since?: string; p_statuses?: string[] }
        Returns: {
          cnt: number
          company_code: string
          company_id: string
          company_name: string
          department_id: string
          department_name: string
          status: string
        }[]
      }
      get_request_drilldown_v2: {
        Args: { p_group_by?: string; p_since?: string; p_statuses?: string[] }
        Returns: {
          cnt: number
          company_code: string
          company_id: string
          company_name: string
          group_id: string
          group_label: string
          status: string
        }[]
      }
      get_review_teams_for_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_reviewer_correction_stats: {
        Args: never
        Returns: {
          correction_count: number
          field_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_attribute_usage_to_values: {
        Args: { p_attribute_id: string; p_min_usage?: number }
        Returns: number
      }
      is_reviewer_for_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_reviewer_for_request: {
        Args: { p_request_id: string; p_stage: number; p_user_id: string }
        Returns: boolean
      }
      merge_duplicate_item: {
        Args: { p_master_id: string; p_reason?: string; p_revoke_id: string }
        Returns: Json
      }
      next_item_code_for_category: {
        Args: {
          p_large_category: string
          p_medium_category: string
          p_small_category: string
        }
        Returns: string
      }
      recalc_all_normalized_names: { Args: never; Returns: number }
      recalc_normalized_names_for_category: {
        Args: { p_small_category_id: string }
        Returns: number
      }
      restore_item: { Args: { p_item_id: string }; Returns: Json }
      revoke_item: {
        Args: {
          p_expected_version?: number
          p_item_id: string
          p_reason: string
        }
        Returns: Json
      }
      set_item_company_active: {
        Args: { p_active: boolean; p_company_id: string; p_item_id: string }
        Returns: Json
      }
      should_run_ai_review: { Args: { p_company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "user"
      request_status:
        | "DRAFT"
        | "PENDING_AI_REVIEW"
        | "AI_PROCESSING"
        | "AI_ESCALATED"
        | "MANUAL_REVIEW_AFTER_AI"
        | "AI_ESCALATED_TO_REQUESTER"
        | "PENDING_REVIEW_1"
        | "PENDING_REVIEW_2"
        | "PENDING_REVIEW_3"
        | "APPROVED"
        | "REJECTED"
        | "REVOKED"
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
      app_role: ["admin", "reviewer", "user"],
      request_status: [
        "DRAFT",
        "PENDING_AI_REVIEW",
        "AI_PROCESSING",
        "AI_ESCALATED",
        "MANUAL_REVIEW_AFTER_AI",
        "AI_ESCALATED_TO_REQUESTER",
        "PENDING_REVIEW_1",
        "PENDING_REVIEW_2",
        "PENDING_REVIEW_3",
        "APPROVED",
        "REJECTED",
        "REVOKED",
      ],
    },
  },
} as const
