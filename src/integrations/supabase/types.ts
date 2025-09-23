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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          base_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          severity: Database["public"]["Enums"]["alert_severity"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          base_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          base_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          created_at: string
          duration: number
          endpoint: string
          error: string | null
          id: string
          ip_address: string | null
          method: string
          status: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration: number
          endpoint: string
          error?: string | null
          id?: string
          ip_address?: string | null
          method: string
          status: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number
          endpoint?: string
          error?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          status?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bases: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          location: string
          manager: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location: string
          manager?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string
          manager?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      boat_checklist_items: {
        Row: {
          checklist_id: string
          item_id: string
          notes: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["checklist_status"] | null
        }
        Insert: {
          checklist_id: string
          item_id: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Update: {
          checklist_id?: string
          item_id?: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "boat_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_checklist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_checklists: {
        Row: {
          boat_id: string | null
          checklist_date: string | null
          created_at: string | null
          customer_signature: string | null
          customer_signature_date: string | null
          customer_signature_url: string | null
          general_notes: string | null
          id: string
          overall_status:
            | Database["public"]["Enums"]["checklist_overall_status"]
            | null
          signature_date: string | null
          signature_url: string | null
          technician_id: string | null
          technician_signature: string | null
        }
        Insert: {
          boat_id?: string | null
          checklist_date?: string | null
          created_at?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          general_notes?: string | null
          id?: string
          overall_status?:
            | Database["public"]["Enums"]["checklist_overall_status"]
            | null
          signature_date?: string | null
          signature_url?: string | null
          technician_id?: string | null
          technician_signature?: string | null
        }
        Update: {
          boat_id?: string | null
          checklist_date?: string | null
          created_at?: string | null
          customer_signature?: string | null
          customer_signature_date?: string | null
          customer_signature_url?: string | null
          general_notes?: string | null
          id?: string
          overall_status?:
            | Database["public"]["Enums"]["checklist_overall_status"]
            | null
          signature_date?: string | null
          signature_url?: string | null
          technician_id?: string | null
          technician_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_checklists_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_checklists_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_components: {
        Row: {
          boat_id: string
          component_name: string
          component_type: string
          created_at: string
          current_engine_hours: number | null
          id: string
          installation_date: string | null
          last_maintenance_date: string | null
          last_oil_change_hours: number | null
          maintenance_interval_days: number | null
          manufacturer: string | null
          model: string | null
          next_maintenance_date: string | null
          notes: string | null
          reference: string | null
          serial_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          boat_id: string
          component_name: string
          component_type: string
          created_at?: string
          current_engine_hours?: number | null
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          last_oil_change_hours?: number | null
          maintenance_interval_days?: number | null
          manufacturer?: string | null
          model?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          reference?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          boat_id?: string
          component_name?: string
          component_type?: string
          created_at?: string
          current_engine_hours?: number | null
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          last_oil_change_hours?: number | null
          maintenance_interval_days?: number | null
          manufacturer?: string | null
          model?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          reference?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      boat_documents: {
        Row: {
          boat_id: string
          category: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          original_name: string
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          boat_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          original_name: string
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          boat_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          original_name?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_documents_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_preparation_checklists: {
        Row: {
          anomalies_count: number | null
          boat_id: string
          completion_date: string | null
          created_at: string | null
          id: string
          items: Json
          planning_activity_id: string | null
          status: string | null
          technician_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          anomalies_count?: number | null
          boat_id: string
          completion_date?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          planning_activity_id?: string | null
          status?: string | null
          technician_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          anomalies_count?: number | null
          boat_id?: string
          completion_date?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          planning_activity_id?: string | null
          status?: string | null
          technician_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_preparation_checklists_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_preparation_checklists_planning_activity_id_fkey"
            columns: ["planning_activity_id"]
            isOneToOne: false
            referencedRelation: "planning_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_preparation_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "preparation_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_rentals: {
        Row: {
          base_id: string | null
          boat_id: string
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_date: string
          id: string
          notes: string | null
          signature_date: string | null
          signature_url: string | null
          start_date: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          base_id?: string | null
          boat_id: string
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_date: string
          id?: string
          notes?: string | null
          signature_date?: string | null
          signature_url?: string | null
          start_date: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          base_id?: string | null
          boat_id?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          signature_date?: string | null
          signature_url?: string | null
          start_date?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_rentals_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_rentals_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_rentals_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_safety_control_items: {
        Row: {
          brand: string | null
          control_id: string
          created_at: string
          expiry_date: string | null
          id: string
          item_name: string
          model: string | null
          notes: string | null
          quantity: number | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          control_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_name: string
          model?: string | null
          notes?: string | null
          quantity?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          control_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_name?: string
          model?: string | null
          notes?: string | null
          quantity?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boat_safety_control_items_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "boat_safety_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_safety_controls: {
        Row: {
          boat_id: string
          category_id: string
          control_date: string | null
          control_year: number
          created_at: string
          id: string
          next_control_date: string | null
          notes: string | null
          performed_by: string | null
          status: string
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          boat_id: string
          category_id: string
          control_date?: string | null
          control_year: number
          created_at?: string
          id?: string
          next_control_date?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          boat_id?: string
          category_id?: string
          control_date?: string | null
          control_year?: number
          created_at?: string
          id?: string
          next_control_date?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boat_safety_controls_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "safety_control_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_safety_controls_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boat_safety_controls_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boat_sub_components: {
        Row: {
          created_at: string
          id: string
          installation_date: string | null
          last_maintenance_date: string | null
          maintenance_interval_days: number | null
          manufacturer: string | null
          model: string | null
          next_maintenance_date: string | null
          notes: string | null
          parent_component_id: string
          position_in_component: string | null
          reference: string | null
          serial_number: string | null
          status: string | null
          sub_component_name: string
          sub_component_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          maintenance_interval_days?: number | null
          manufacturer?: string | null
          model?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          parent_component_id: string
          position_in_component?: string | null
          reference?: string | null
          serial_number?: string | null
          status?: string | null
          sub_component_name: string
          sub_component_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installation_date?: string | null
          last_maintenance_date?: string | null
          maintenance_interval_days?: number | null
          manufacturer?: string | null
          model?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          parent_component_id?: string
          position_in_component?: string | null
          reference?: string | null
          serial_number?: string | null
          status?: string | null
          sub_component_name?: string
          sub_component_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boat_sub_components_parent_component_id_fkey"
            columns: ["parent_component_id"]
            isOneToOne: false
            referencedRelation: "boat_components"
            referencedColumns: ["id"]
          },
        ]
      }
      boats: {
        Row: {
          base_id: string | null
          created_at: string | null
          current_engine_hours: number | null
          current_engine_hours_port: number | null
          current_engine_hours_starboard: number | null
          documents: string[] | null
          id: string
          last_engine_hours_update: string | null
          last_oil_change_hours: number | null
          last_oil_change_hours_port: number | null
          last_oil_change_hours_starboard: number | null
          model: string
          name: string
          next_maintenance: string | null
          serial_number: string
          status: Database["public"]["Enums"]["boat_status"] | null
          updated_at: string | null
          year: number
        }
        Insert: {
          base_id?: string | null
          created_at?: string | null
          current_engine_hours?: number | null
          current_engine_hours_port?: number | null
          current_engine_hours_starboard?: number | null
          documents?: string[] | null
          id?: string
          last_engine_hours_update?: string | null
          last_oil_change_hours?: number | null
          last_oil_change_hours_port?: number | null
          last_oil_change_hours_starboard?: number | null
          model: string
          name: string
          next_maintenance?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["boat_status"] | null
          updated_at?: string | null
          year: number
        }
        Update: {
          base_id?: string | null
          created_at?: string | null
          current_engine_hours?: number | null
          current_engine_hours_port?: number | null
          current_engine_hours_starboard?: number | null
          documents?: string[] | null
          id?: string
          last_engine_hours_update?: string | null
          last_oil_change_hours?: number | null
          last_oil_change_hours_port?: number | null
          last_oil_change_hours_starboard?: number | null
          model?: string
          name?: string
          next_maintenance?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["boat_status"] | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "boats_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boats_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_purchase_campaigns: {
        Row: {
          campaign_year: number
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          total_estimated_value: number | null
          total_items: number | null
          updated_at: string
        }
        Insert: {
          campaign_year?: number
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          total_estimated_value?: number | null
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          campaign_year?: number
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          total_estimated_value?: number | null
          total_items?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bulk_purchase_distributions: {
        Row: {
          allocated_quantity: number
          base_id: string
          created_at: string
          distribution_date: string | null
          id: string
          notes: string | null
          order_id: string
          order_item_id: string
          received_quantity: number
          status: string | null
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number
          base_id: string
          created_at?: string
          distribution_date?: string | null
          id?: string
          notes?: string | null
          order_id: string
          order_item_id: string
          received_quantity?: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          base_id?: string
          created_at?: string
          distribution_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          order_item_id?: string
          received_quantity?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_purchase_distributions_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_purchase_distributions_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_purchase_distributions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_purchase_distributions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_purchase_template_items: {
        Row: {
          category: string | null
          created_at: string
          estimated_quantity: number
          estimated_unit_price: number
          id: string
          notes: string | null
          priority: string | null
          product_name: string
          template_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          estimated_quantity?: number
          estimated_unit_price?: number
          id?: string
          notes?: string | null
          priority?: string | null
          product_name: string
          template_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          estimated_quantity?: number
          estimated_unit_price?: number
          id?: string
          notes?: string | null
          priority?: string | null
          product_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_purchase_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bulk_purchase_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_purchase_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_purchase_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_purchase_templates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_base_distributions: {
        Row: {
          allocated_quantity: number | null
          base_id: string
          campaign_item_id: string
          created_at: string
          id: string
          notes: string | null
          priority: string | null
          requested_quantity: number
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number | null
          base_id: string
          campaign_item_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          requested_quantity?: number
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number | null
          base_id?: string
          campaign_item_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          requested_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaign_base_distributions_base_id"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_base_distributions_base_id"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_base_distributions_campaign_item_id"
            columns: ["campaign_item_id"]
            isOneToOne: false
            referencedRelation: "campaign_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_items: {
        Row: {
          campaign_id: string
          category: string | null
          consolidation_status: string | null
          created_at: string
          description: string | null
          estimated_unit_price: number | null
          id: string
          notes: string | null
          original_requests: Json | null
          priority: string | null
          product_name: string
          selected_quote_id: string | null
          selected_supplier_id: string | null
          total_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          category?: string | null
          consolidation_status?: string | null
          created_at?: string
          description?: string | null
          estimated_unit_price?: number | null
          id?: string
          notes?: string | null
          original_requests?: Json | null
          priority?: string | null
          product_name: string
          selected_quote_id?: string | null
          selected_supplier_id?: string | null
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          category?: string | null
          consolidation_status?: string | null
          created_at?: string
          description?: string | null
          estimated_unit_price?: number | null
          id?: string
          notes?: string | null
          original_requests?: Json | null
          priority?: string | null
          product_name?: string
          selected_quote_id?: string | null
          selected_supplier_id?: string | null
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaign_items_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_purchase_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_items_selected_quote_id"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign_items_selected_supplier_id"
            columns: ["selected_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          category: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["checklist_status"] | null
        }
        Insert: {
          category?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Update: {
          category?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Relationships: []
      }
      component_purchase_history: {
        Row: {
          component_id: string | null
          created_at: string
          id: string
          installation_date: string | null
          invoice_reference: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          purchase_date: string
          quantity: number
          quote_id: string | null
          stock_item_id: string | null
          sub_component_id: string | null
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number
          warranty_months: number | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          invoice_reference?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          purchase_date: string
          quantity?: number
          quote_id?: string | null
          stock_item_id?: string | null
          sub_component_id?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warranty_months?: number | null
        }
        Update: {
          component_id?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          invoice_reference?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          purchase_date?: string
          quantity?: number
          quote_id?: string | null
          stock_item_id?: string | null
          sub_component_id?: string | null
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "component_purchase_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "boat_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_purchase_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_purchase_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_purchase_history_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_purchase_history_sub_component_id_fkey"
            columns: ["sub_component_id"]
            isOneToOne: false
            referencedRelation: "boat_sub_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_purchase_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      component_stock_links: {
        Row: {
          component_id: string | null
          created_at: string
          id: string
          notes: string | null
          quantity_required: number | null
          replacement_priority: string | null
          stock_item_id: string
          sub_component_id: string | null
          updated_at: string
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity_required?: number | null
          replacement_priority?: string | null
          stock_item_id: string
          sub_component_id?: string | null
          updated_at?: string
        }
        Update: {
          component_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity_required?: number | null
          replacement_priority?: string | null
          stock_item_id?: string
          sub_component_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_stock_links_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "boat_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_stock_links_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_stock_links_sub_component_id_fkey"
            columns: ["sub_component_id"]
            isOneToOne: false
            referencedRelation: "boat_sub_components"
            referencedColumns: ["id"]
          },
        ]
      }
      component_supplier_references: {
        Row: {
          catalog_reference: string | null
          component_id: string | null
          created_at: string
          id: string
          last_quote_date: string | null
          last_quoted_price: number | null
          lead_time_days: number | null
          minimum_order_quantity: number | null
          notes: string | null
          preferred_supplier: boolean | null
          sub_component_id: string | null
          supplier_id: string
          supplier_part_number: string | null
          updated_at: string
        }
        Insert: {
          catalog_reference?: string | null
          component_id?: string | null
          created_at?: string
          id?: string
          last_quote_date?: string | null
          last_quoted_price?: number | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          notes?: string | null
          preferred_supplier?: boolean | null
          sub_component_id?: string | null
          supplier_id: string
          supplier_part_number?: string | null
          updated_at?: string
        }
        Update: {
          catalog_reference?: string | null
          component_id?: string | null
          created_at?: string
          id?: string
          last_quote_date?: string | null
          last_quoted_price?: number | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          notes?: string | null
          preferred_supplier?: boolean | null
          sub_component_id?: string | null
          supplier_id?: string
          supplier_part_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_supplier_references_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "boat_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_supplier_references_sub_component_id_fkey"
            columns: ["sub_component_id"]
            isOneToOne: false
            referencedRelation: "boat_sub_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_supplier_references_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          created_at: string
          id: string
          layout_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intervention_parts: {
        Row: {
          component_id: string | null
          id: string
          intervention_id: string
          notes: string | null
          part_name: string
          quantity: number
          stock_item_id: string | null
          total_cost: number | null
          unit_cost: number | null
          used_at: string | null
        }
        Insert: {
          component_id?: string | null
          id?: string
          intervention_id: string
          notes?: string | null
          part_name: string
          quantity?: number
          stock_item_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          used_at?: string | null
        }
        Update: {
          component_id?: string | null
          id?: string
          intervention_id?: string
          notes?: string | null
          part_name?: string
          quantity?: number
          stock_item_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_parts_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_parts_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_tasks: {
        Row: {
          intervention_id: string
          task_id: string
        }
        Insert: {
          intervention_id: string
          task_id: string
        }
        Update: {
          intervention_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_tasks_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          base_id: string | null
          boat_id: string | null
          completed_at: string | null
          completed_date: string | null
          component_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          engine_hours_end: number | null
          engine_hours_end_port: number | null
          engine_hours_end_starboard: number | null
          engine_hours_start: number | null
          engine_hours_start_port: number | null
          engine_hours_start_starboard: number | null
          id: string
          intervention_type: string | null
          is_oil_change: boolean | null
          notes: string | null
          priority: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["intervention_status"] | null
          technician_id: string | null
          title: string
        }
        Insert: {
          base_id?: string | null
          boat_id?: string | null
          completed_at?: string | null
          completed_date?: string | null
          component_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          engine_hours_end?: number | null
          engine_hours_end_port?: number | null
          engine_hours_end_starboard?: number | null
          engine_hours_start?: number | null
          engine_hours_start_port?: number | null
          engine_hours_start_starboard?: number | null
          id?: string
          intervention_type?: string | null
          is_oil_change?: boolean | null
          notes?: string | null
          priority?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["intervention_status"] | null
          technician_id?: string | null
          title: string
        }
        Update: {
          base_id?: string | null
          boat_id?: string | null
          completed_at?: string | null
          completed_date?: string | null
          component_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          engine_hours_end?: number | null
          engine_hours_end_port?: number | null
          engine_hours_end_starboard?: number | null
          engine_hours_start?: number | null
          engine_hours_start_port?: number | null
          engine_hours_start_starboard?: number | null
          id?: string
          intervention_type?: string | null
          is_oil_change?: boolean | null
          notes?: string | null
          priority?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["intervention_status"] | null
          technician_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "boat_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      maintenance_manual_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interval_unit: string
          interval_value: number
          manual_id: string
          task_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interval_unit: string
          interval_value: number
          manual_id: string
          task_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interval_unit?: string
          interval_value?: number
          manual_id?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_manual_tasks_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "maintenance_manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_manuals: {
        Row: {
          boat_id: string | null
          boat_model: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          manufacturer: string
          updated_at: string
        }
        Insert: {
          boat_id?: string | null
          boat_model: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer: string
          updated_at?: string
        }
        Update: {
          boat_id?: string | null
          boat_model?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_manuals_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_manuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          boat_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          estimated_duration: number | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"] | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          title: string
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          boat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          title: string
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          boat_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"] | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          base_id: string | null
          id: string
          order_id: string | null
          product_name: string
          quantity: number
          reference: string | null
          stock_item_id: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          base_id?: string | null
          id?: string
          order_id?: string | null
          product_name: string
          quantity?: number
          reference?: string | null
          stock_item_id?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          base_id?: string | null
          id?: string
          order_id?: string | null
          product_name?: string
          quantity?: number
          reference?: string | null
          stock_item_id?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_id: string | null
          boat_id: string | null
          bulk_purchase_type: string | null
          carrier: string | null
          created_at: string | null
          delivery_date: string | null
          distribution_status: string | null
          documents: string[] | null
          expected_delivery_date: string | null
          id: string
          is_bulk_purchase: boolean | null
          is_purchase_request: boolean | null
          notes: string | null
          order_date: string | null
          order_number: string
          photos: string[] | null
          rejection_reason: string | null
          request_notes: string | null
          requested_by: string | null
          status: string | null
          stock_added: boolean | null
          supplier_id: string | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          urgency_level: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_id?: string | null
          boat_id?: string | null
          bulk_purchase_type?: string | null
          carrier?: string | null
          created_at?: string | null
          delivery_date?: string | null
          distribution_status?: string | null
          documents?: string[] | null
          expected_delivery_date?: string | null
          id?: string
          is_bulk_purchase?: boolean | null
          is_purchase_request?: boolean | null
          notes?: string | null
          order_date?: string | null
          order_number: string
          photos?: string[] | null
          rejection_reason?: string | null
          request_notes?: string | null
          requested_by?: string | null
          status?: string | null
          stock_added?: boolean | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          urgency_level?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_id?: string | null
          boat_id?: string | null
          bulk_purchase_type?: string | null
          carrier?: string | null
          created_at?: string | null
          delivery_date?: string | null
          distribution_status?: string | null
          documents?: string[] | null
          expected_delivery_date?: string | null
          id?: string
          is_bulk_purchase?: boolean | null
          is_purchase_request?: boolean | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          photos?: string[] | null
          rejection_reason?: string | null
          request_notes?: string | null
          requested_by?: string | null
          status?: string | null
          stock_added?: boolean | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actual_duration: number | null
          actual_end: string | null
          actual_start: string | null
          base_id: string
          boat_id: string | null
          checklist_completed: boolean | null
          color_code: string | null
          created_at: string
          delay_minutes: number | null
          description: string | null
          estimated_duration: number | null
          id: string
          notes: string | null
          original_intervention_id: string | null
          performance_rating: number | null
          planned_by: string | null
          priority: string | null
          rental_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: Database["public"]["Enums"]["activity_status"]
          technician_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          actual_duration?: number | null
          actual_end?: string | null
          actual_start?: string | null
          base_id: string
          boat_id?: string | null
          checklist_completed?: boolean | null
          color_code?: string | null
          created_at?: string
          delay_minutes?: number | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          original_intervention_id?: string | null
          performance_rating?: number | null
          planned_by?: string | null
          priority?: string | null
          rental_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: Database["public"]["Enums"]["activity_status"]
          technician_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          actual_duration?: number | null
          actual_end?: string | null
          actual_start?: string | null
          base_id?: string
          boat_id?: string | null
          checklist_completed?: boolean | null
          color_code?: string | null
          created_at?: string
          delay_minutes?: number | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          original_intervention_id?: string | null
          performance_rating?: number | null
          planned_by?: string | null
          priority?: string | null
          rental_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: Database["public"]["Enums"]["activity_status"]
          technician_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_activities_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_activities_original_intervention_id_fkey"
            columns: ["original_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_conflicts: {
        Row: {
          activity_id_1: string
          activity_id_2: string
          auto_detected: boolean | null
          conflict_type: string
          created_at: string
          id: string
          resolution_notes: string | null
          resolved: boolean | null
          severity: string
        }
        Insert: {
          activity_id_1: string
          activity_id_2: string
          auto_detected?: boolean | null
          conflict_type: string
          created_at?: string
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          severity?: string
        }
        Update: {
          activity_id_1?: string
          activity_id_2?: string
          auto_detected?: boolean | null
          conflict_type?: string
          created_at?: string
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_conflicts_activity_id_1_fkey"
            columns: ["activity_id_1"]
            isOneToOne: false
            referencedRelation: "planning_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_conflicts_activity_id_2_fkey"
            columns: ["activity_id_2"]
            isOneToOne: false
            referencedRelation: "planning_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_templates: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          base_id: string | null
          checklist_items: Json | null
          color_code: string | null
          created_at: string
          created_by: string | null
          default_priority: string | null
          description: string | null
          estimated_duration: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          base_id?: string | null
          checklist_items?: Json | null
          color_code?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          description?: string | null
          estimated_duration: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          base_id?: string | null
          checklist_items?: Json | null
          color_code?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: string | null
          description?: string | null
          estimated_duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_templates_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_templates_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_anomalies: {
        Row: {
          auto_maintenance_created: boolean | null
          created_at: string | null
          description: string
          id: string
          intervention_id: string | null
          item_name: string
          photo_url: string | null
          preparation_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
        }
        Insert: {
          auto_maintenance_created?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          intervention_id?: string | null
          item_name: string
          photo_url?: string | null
          preparation_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
        }
        Update: {
          auto_maintenance_created?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          intervention_id?: string | null
          item_name?: string
          photo_url?: string | null
          preparation_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preparation_anomalies_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_anomalies_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: false
            referencedRelation: "boat_preparation_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_checklist_templates: {
        Row: {
          base_id: string | null
          boat_model: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          base_id?: string | null
          boat_model?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          base_id?: string | null
          boat_model?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preparation_checklist_templates_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_checklist_templates_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          profile_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          profile_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          profile_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_id: string | null
          can_complete_interventions: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          base_id?: string | null
          can_complete_interventions?: boolean | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          base_id?: string | null
          can_complete_interventions?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasing_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchasing_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_analysis: {
        Row: {
          analysis_data: Json
          analysis_date: string | null
          best_price_quote_id: string | null
          best_quality_quote_id: string | null
          best_value_quote_id: string | null
          campaign_item_id: string
          created_at: string
          id: string
          recommendation: string | null
          updated_at: string
        }
        Insert: {
          analysis_data?: Json
          analysis_date?: string | null
          best_price_quote_id?: string | null
          best_quality_quote_id?: string | null
          best_value_quote_id?: string | null
          campaign_item_id: string
          created_at?: string
          id?: string
          recommendation?: string | null
          updated_at?: string
        }
        Update: {
          analysis_data?: Json
          analysis_date?: string | null
          best_price_quote_id?: string | null
          best_quality_quote_id?: string | null
          best_value_quote_id?: string | null
          campaign_item_id?: string
          created_at?: string
          id?: string
          recommendation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_quote_analysis_campaign_item_id"
            columns: ["campaign_item_id"]
            isOneToOne: false
            referencedRelation: "campaign_items"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_control_categories: {
        Row: {
          color_code: string | null
          created_at: string
          description: string | null
          frequency_months: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string
          description?: string | null
          frequency_months?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color_code?: string | null
          created_at?: string
          description?: string | null
          frequency_months?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_maintenance: {
        Row: {
          boat_id: string
          created_at: string
          id: string
          intervention_id: string | null
          manual_task_id: string
          scheduled_date: string
          status: string
          task_name: string
          updated_at: string
        }
        Insert: {
          boat_id: string
          created_at?: string
          id?: string
          intervention_id?: string | null
          manual_task_id: string
          scheduled_date: string
          status?: string
          task_name: string
          updated_at?: string
        }
        Update: {
          boat_id?: string
          created_at?: string
          id?: string
          intervention_id?: string | null
          manual_task_id?: string
          scheduled_date?: string
          status?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_maintenance_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_maintenance_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_maintenance_manual_task_id_fkey"
            columns: ["manual_task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_manual_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_item_quotes: {
        Row: {
          attachment_url: string | null
          created_at: string
          currency: string
          delivery_days: number | null
          id: string
          minimum_quantity: number
          notes: string | null
          payment_terms: string | null
          quote_date: string
          quote_number: string | null
          requested_by: string | null
          response_date: string | null
          selected_at: string | null
          selected_by: string | null
          status: string
          stock_item_id: string
          supplier_id: string
          unit_price: number
          updated_at: string
          validity_date: string | null
          warranty_months: number | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          minimum_quantity?: number
          notes?: string | null
          payment_terms?: string | null
          quote_date?: string
          quote_number?: string | null
          requested_by?: string | null
          response_date?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: string
          stock_item_id: string
          supplier_id: string
          unit_price?: number
          updated_at?: string
          validity_date?: string | null
          warranty_months?: number | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          minimum_quantity?: number
          notes?: string | null
          payment_terms?: string | null
          quote_date?: string
          quote_number?: string | null
          requested_by?: string | null
          response_date?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: string
          stock_item_id?: string
          supplier_id?: string
          unit_price?: number
          updated_at?: string
          validity_date?: string | null
          warranty_months?: number | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          base_id: string | null
          category: string | null
          id: string
          last_purchase_cost: number | null
          last_purchase_date: string | null
          last_supplier_id: string | null
          last_updated: string | null
          location: string | null
          min_threshold: number | null
          name: string
          photo_url: string | null
          quantity: number | null
          reference: string | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          base_id?: string | null
          category?: string | null
          id?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          last_supplier_id?: string | null
          last_updated?: string | null
          location?: string | null
          min_threshold?: number | null
          name: string
          photo_url?: string | null
          quantity?: number | null
          reference?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          base_id?: string | null
          category?: string | null
          id?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          last_supplier_id?: string | null
          last_updated?: string | null
          location?: string | null
          min_threshold?: number | null
          name?: string
          photo_url?: string | null
          quantity?: number | null
          reference?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_last_supplier_id_fkey"
            columns: ["last_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor: string
          base_id: string
          id: string
          movement_type: string
          notes: string | null
          package_id: string | null
          qty: number
          scan_event_id: string | null
          shipment_id: string | null
          sku: string
          tenant_id: string
          ts: string | null
        }
        Insert: {
          actor?: string
          base_id: string
          id?: string
          movement_type: string
          notes?: string | null
          package_id?: string | null
          qty: number
          scan_event_id?: string | null
          shipment_id?: string | null
          sku: string
          tenant_id?: string
          ts?: string | null
        }
        Update: {
          actor?: string
          base_id?: string
          id?: string
          movement_type?: string
          notes?: string | null
          package_id?: string | null
          qty?: number
          scan_event_id?: string | null
          shipment_id?: string | null
          sku?: string
          tenant_id?: string
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_purchase_history: {
        Row: {
          created_at: string
          id: string
          invoice_reference: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          purchase_date: string
          quantity: number
          stock_item_id: string
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number
          updated_at: string
          warranty_months: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          purchase_date?: string
          quantity?: number
          stock_item_id: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          warranty_months?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          purchase_date?: string
          quantity?: number
          stock_item_id?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_purchase_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchase_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchase_history_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchase_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string
          id: string
          intervention_id: string | null
          notes: string | null
          quantity: number
          released_at: string | null
          reserved_at: string
          reserved_by: string | null
          status: string
          stock_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_id?: string | null
          notes?: string | null
          quantity?: number
          released_at?: string | null
          reserved_at?: string
          reserved_by?: string | null
          status?: string
          stock_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intervention_id?: string | null
          notes?: string | null
          quantity?: number
          released_at?: string | null
          reserved_at?: string
          reserved_by?: string | null
          status?: string
          stock_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          contract_number: string
          contract_type: string
          created_at: string | null
          created_by: string
          end_date: string | null
          id: string
          minimum_order_amount: number | null
          negotiated_discount: number | null
          payment_terms: number | null
          start_date: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          contract_number: string
          contract_type: string
          created_at?: string | null
          created_by: string
          end_date?: string | null
          id?: string
          minimum_order_amount?: number | null
          negotiated_discount?: number | null
          payment_terms?: number | null
          start_date: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          contract_number?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          id?: string
          minimum_order_amount?: number | null
          negotiated_discount?: number | null
          payment_terms?: number | null
          start_date?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          document_name: string
          document_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          supplier_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          document_name: string
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          supplier_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          document_name?: string
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          supplier_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluations: {
        Row: {
          created_at: string | null
          delivery_score: number
          evaluation_date: string
          evaluator_id: string
          id: string
          notes: string | null
          overall_score: number | null
          price_score: number
          quality_score: number
          service_score: number
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_score: number
          evaluation_date?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          price_score: number
          quality_score: number
          service_score: number
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_score?: number
          evaluation_date?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          price_score?: number
          quality_score?: number
          service_score?: number
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_interactions: {
        Row: {
          created_at: string | null
          description: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          interaction_date: string
          interaction_type: string
          subject: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_type: string
          subject: string
          supplier_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          subject?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_interactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes: {
        Row: {
          campaign_item_id: string
          created_at: string
          delivery_time_days: number | null
          id: string
          minimum_quantity: number | null
          notes: string | null
          quality_rating: number | null
          quote_date: string | null
          quote_reference: string | null
          status: string | null
          supplier_id: string
          unit_price: number
          updated_at: string
          valid_until: string | null
          warranty_months: number | null
        }
        Insert: {
          campaign_item_id: string
          created_at?: string
          delivery_time_days?: number | null
          id?: string
          minimum_quantity?: number | null
          notes?: string | null
          quality_rating?: number | null
          quote_date?: string | null
          quote_reference?: string | null
          status?: string | null
          supplier_id: string
          unit_price?: number
          updated_at?: string
          valid_until?: string | null
          warranty_months?: number | null
        }
        Update: {
          campaign_item_id?: string
          created_at?: string
          delivery_time_days?: number | null
          id?: string
          minimum_quantity?: number | null
          notes?: string | null
          quality_rating?: number | null
          quote_date?: string | null
          quote_reference?: string | null
          status?: string | null
          supplier_id?: string
          unit_price?: number
          updated_at?: string
          valid_until?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_supplier_quotes_campaign_item_id"
            columns: ["campaign_item_id"]
            isOneToOne: false
            referencedRelation: "campaign_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_supplier_quotes_supplier_id"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          base_id: string | null
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          base_id?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          base_id?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          base_id: string
          boat_id: string | null
          carrier: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          item_name: string
          item_reference: string | null
          photo_url: string | null
          purchase_price: number | null
          quantity_needed: number
          rejection_reason: string | null
          request_number: string
          requested_by: string
          shipped_at: string | null
          status: string
          stock_item_id: string | null
          supplier_name: string | null
          tracking_number: string | null
          updated_at: string
          urgency_level: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          base_id: string
          boat_id?: string | null
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          item_reference?: string | null
          photo_url?: string | null
          purchase_price?: number | null
          quantity_needed?: number
          rejection_reason?: string | null
          request_number: string
          requested_by: string
          shipped_at?: string | null
          status?: string
          stock_item_id?: string | null
          supplier_name?: string | null
          tracking_number?: string | null
          updated_at?: string
          urgency_level?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          base_id?: string
          boat_id?: string | null
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          item_reference?: string | null
          photo_url?: string | null
          purchase_price?: number | null
          quantity_needed?: number
          rejection_reason?: string | null
          request_number?: string
          requested_by?: string
          shipped_at?: string | null
          status?: string
          stock_item_id?: string | null
          supplier_name?: string | null
          tracking_number?: string | null
          updated_at?: string
          urgency_level?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_at: string
          granted_by: string | null
          id: string
          page_permission: Database["public"]["Enums"]["page_permission"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_permission: Database["public"]["Enums"]["page_permission"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_permission?: Database["public"]["Enums"]["page_permission"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_adjustment_rules: {
        Row: {
          action: string
          adjustment_days: number | null
          base_id: string | null
          created_at: string
          id: string
          is_active: boolean
          max_precipitation: number | null
          max_temperature: number | null
          max_wind_speed: number | null
          min_temperature: number | null
          priority_adjustment: number | null
          rule_name: string
          updated_at: string
          weather_condition: string
        }
        Insert: {
          action: string
          adjustment_days?: number | null
          base_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_precipitation?: number | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          min_temperature?: number | null
          priority_adjustment?: number | null
          rule_name: string
          updated_at?: string
          weather_condition: string
        }
        Update: {
          action?: string
          adjustment_days?: number | null
          base_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_precipitation?: number | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          min_temperature?: number | null
          priority_adjustment?: number | null
          rule_name?: string
          updated_at?: string
          weather_condition?: string
        }
        Relationships: []
      }
      weather_forecasts: {
        Row: {
          base_id: string
          created_at: string
          fetched_at: string
          forecast_date: string
          humidity: number | null
          id: string
          precipitation: number | null
          temperature_max: number
          temperature_min: number
          weather_code: string | null
          weather_condition: string
          wind_speed: number | null
        }
        Insert: {
          base_id: string
          created_at?: string
          fetched_at?: string
          forecast_date: string
          humidity?: number | null
          id?: string
          precipitation?: number | null
          temperature_max: number
          temperature_min: number
          weather_code?: string | null
          weather_condition: string
          wind_speed?: number | null
        }
        Update: {
          base_id?: string
          created_at?: string
          fetched_at?: string
          forecast_date?: string
          humidity?: number | null
          id?: string
          precipitation?: number | null
          temperature_max?: number
          temperature_min?: number
          weather_code?: string | null
          weather_condition?: string
          wind_speed?: number | null
        }
        Relationships: []
      }
      weather_notifications: {
        Row: {
          base_id: string
          created_at: string
          id: string
          is_sent: boolean
          maintenance_id: string | null
          message: string
          notification_type: string
          scheduled_for: string | null
          sent_at: string | null
          severity: string
          weather_condition: string
        }
        Insert: {
          base_id: string
          created_at?: string
          id?: string
          is_sent?: boolean
          maintenance_id?: string | null
          message: string
          notification_type: string
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string
          weather_condition: string
        }
        Update: {
          base_id?: string
          created_at?: string
          id?: string
          is_sent?: boolean
          maintenance_id?: string | null
          message?: string
          notification_type?: string
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string
          weather_condition?: string
        }
        Relationships: []
      }
    }
    Views: {
      bases_public: {
        Row: {
          id: string | null
          location: string | null
          name: string | null
        }
        Insert: {
          id?: string | null
          location?: string | null
          name?: string | null
        }
        Update: {
          id?: string | null
          location?: string | null
          name?: string | null
        }
        Relationships: []
      }
      purchasing_analytics: {
        Row: {
          avg_order_value: number | null
          base_id: string | null
          base_name: string | null
          delivered_count: number | null
          month: string | null
          order_count: number | null
          pending_count: number | null
          supplier_category: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_item_by_scan: {
        Args: {
          p_package_code?: string
          p_qty?: number
          p_shipment_id: string
          p_sku: string
        }
        Returns: string
      }
      add_order_items_to_stock: {
        Args: { order_id_param: string; selected_items?: Json }
        Returns: Json
      }
      calculate_next_maintenance_date: {
        Args: {
          interval_unit: string
          interval_value: number
          last_date: string
        }
        Returns: string
      }
      calculate_oil_change_status: {
        Args: { current_hours: number; last_change_hours: number }
        Returns: string
      }
      can_complete_interventions: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      evaluate_weather_for_maintenance: {
        Args: { base_id_param: string; maintenance_date: string }
        Returns: Json
      }
      generate_stock_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_supply_request_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_base_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_page_permissions: {
        Args: { user_id_param: string }
        Returns: {
          granted: boolean
          page_permission: Database["public"]["Enums"]["page_permission"]
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      handle_shipment_item_reception: {
        Args: {
          destination_base_id: string
          item_sku: string
          received_by_user_id: string
        }
        Returns: Json
      }
      has_page_permission: {
        Args: {
          page_param: Database["public"]["Enums"]["page_permission"]
          user_id_param: string
        }
        Returns: boolean
      }
      initialize_purchase_workflow: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      link_stock_scan_to_order: {
        Args: {
          order_id_param: string
          quantity_received_param: number
          stock_item_id_param: string
        }
        Returns: Json
      }
      link_stock_scan_to_supply_request: {
        Args:
          | {
              p_quantity_received: number
              p_stock_item_id: string
              p_supply_request_id: string
              p_unit_cost?: number
            }
          | {
              quantity_received_param: number
              request_id_param: string
              stock_item_id_param: string
            }
          | { scan_data: Json; supply_request_id: string }
        Returns: Json
      }
      mark_shipped: {
        Args: { p_shipment_id: string }
        Returns: boolean
      }
      process_workflow_automation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      receive_scan: {
        Args: {
          p_package_code?: string
          p_qty: number
          p_scan_event_id?: string
          p_shipment_id: string
          p_sku: string
        }
        Returns: string
      }
      refresh_purchasing_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      resolve_workflow_alert: {
        Args: { alert_id_param: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_user_profile: {
        Args: {
          new_base_id?: string
          new_name?: string
          new_role?: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "overdue"
      activity_type:
        | "maintenance"
        | "checkin"
        | "checkout"
        | "travel"
        | "break"
        | "emergency"
        | "preparation"
      alert_severity: "info" | "warning" | "error"
      alert_type: "stock" | "maintenance" | "document" | "system"
      boat_status: "available" | "rented" | "maintenance" | "out_of_service"
      checklist_overall_status: "ok" | "needs_attention" | "major_issues"
      checklist_status: "ok" | "needs_repair" | "not_checked"
      intervention_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "delivered"
        | "cancelled"
        | "pending_approval"
        | "supplier_requested"
        | "shipping_mainland"
        | "shipping_antilles"
        | "approved"
        | "supplier_search"
        | "order_confirmed"
        | "received_scanned"
        | "completed"
        | "rejected"
      page_permission:
        | "dashboard"
        | "boats"
        | "safety_controls"
        | "suppliers"
        | "orders"
        | "stock"
        | "stock_scanner"
        | "maintenance"
        | "maintenance_gantt"
        | "maintenance_history"
        | "maintenance_preventive"
        | "notifications"
        | "supply_requests"
        | "distribution"
        | "boat_preparation"
      purchase_workflow_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "supplier_search"
        | "ordered"
        | "received"
        | "completed"
        | "rejected"
        | "cancelled"
      user_role: "direction" | "chef_base" | "technicien"
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
      activity_status: [
        "planned",
        "in_progress",
        "completed",
        "cancelled",
        "overdue",
      ],
      activity_type: [
        "maintenance",
        "checkin",
        "checkout",
        "travel",
        "break",
        "emergency",
        "preparation",
      ],
      alert_severity: ["info", "warning", "error"],
      alert_type: ["stock", "maintenance", "document", "system"],
      boat_status: ["available", "rented", "maintenance", "out_of_service"],
      checklist_overall_status: ["ok", "needs_attention", "major_issues"],
      checklist_status: ["ok", "needs_repair", "not_checked"],
      intervention_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
      order_status: [
        "pending",
        "confirmed",
        "delivered",
        "cancelled",
        "pending_approval",
        "supplier_requested",
        "shipping_mainland",
        "shipping_antilles",
        "approved",
        "supplier_search",
        "order_confirmed",
        "received_scanned",
        "completed",
        "rejected",
      ],
      page_permission: [
        "dashboard",
        "boats",
        "safety_controls",
        "suppliers",
        "orders",
        "stock",
        "stock_scanner",
        "maintenance",
        "maintenance_gantt",
        "maintenance_history",
        "maintenance_preventive",
        "notifications",
        "supply_requests",
        "distribution",
        "boat_preparation",
      ],
      purchase_workflow_status: [
        "draft",
        "pending_approval",
        "approved",
        "supplier_search",
        "ordered",
        "received",
        "completed",
        "rejected",
        "cancelled",
      ],
      user_role: ["direction", "chef_base", "technicien"],
    },
  },
} as const
