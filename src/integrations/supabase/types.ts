export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          status: Database["public"]["Enums"]["checklist_status"] | null
        }
        Insert: {
          checklist_id: string
          item_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Update: {
          checklist_id?: string
          item_id?: string
          notes?: string | null
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
            foreignKeyName: "boat_rentals_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      boats: {
        Row: {
          base_id: string | null
          created_at: string | null
          documents: string[] | null
          id: string
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
          documents?: string[] | null
          id?: string
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
          documents?: string[] | null
          id?: string
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
          id: string
          is_required: boolean | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["checklist_status"] | null
        }
        Insert: {
          category?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Update: {
          category?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"] | null
        }
        Relationships: []
      }
      intervention_parts: {
        Row: {
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
          completed_date: string | null
          created_at: string | null
          description: string | null
          id: string
          intervention_type: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["intervention_status"] | null
          technician_id: string | null
          title: string
        }
        Insert: {
          base_id?: string | null
          boat_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          intervention_type?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["intervention_status"] | null
          technician_id?: string | null
          title: string
        }
        Update: {
          base_id?: string | null
          boat_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          intervention_type?: string | null
          scheduled_date?: string | null
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
            foreignKeyName: "interventions_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
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
      logistics_receipt_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          notes: string | null
          product_name: string
          product_reference: string | null
          quantity_accepted: number
          quantity_expected: number
          quantity_received: number
          receipt_id: string
          scanned_at: string | null
          scanned_by: string | null
          shipment_item_id: string | null
          stock_item_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_name: string
          product_reference?: string | null
          quantity_accepted?: number
          quantity_expected: number
          quantity_received?: number
          receipt_id: string
          scanned_at?: string | null
          scanned_by?: string | null
          shipment_item_id?: string | null
          stock_item_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_name?: string
          product_reference?: string | null
          quantity_accepted?: number
          quantity_expected?: number
          quantity_received?: number
          receipt_id?: string
          scanned_at?: string | null
          scanned_by?: string | null
          shipment_item_id?: string | null
          stock_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "logistics_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipt_items_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipt_items_shipment_item_id_fkey"
            columns: ["shipment_item_id"]
            isOneToOne: false
            referencedRelation: "logistics_shipment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipt_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_receipts: {
        Row: {
          base_id: string
          condition_notes: string | null
          created_at: string
          discrepancies: string | null
          id: string
          packages_expected: number | null
          packages_received: number | null
          receipt_number: string
          received_by: string | null
          received_date: string | null
          shipment_id: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          base_id: string
          condition_notes?: string | null
          created_at?: string
          discrepancies?: string | null
          id?: string
          packages_expected?: number | null
          packages_received?: number | null
          receipt_number: string
          received_by?: string | null
          received_date?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          base_id?: string
          condition_notes?: string | null
          created_at?: string
          discrepancies?: string | null
          id?: string
          packages_expected?: number | null
          packages_received?: number | null
          receipt_number?: string
          received_by?: string | null
          received_date?: string | null
          shipment_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_receipts_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "logistics_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_receipts_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_shipment_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          package_number: string | null
          product_name: string
          product_reference: string | null
          quantity_shipped: number
          scanned_at: string | null
          scanned_by: string | null
          shipment_id: string
          stock_item_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          package_number?: string | null
          product_name: string
          product_reference?: string | null
          quantity_shipped: number
          scanned_at?: string | null
          scanned_by?: string | null
          shipment_id: string
          stock_item_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          package_number?: string | null
          product_name?: string
          product_reference?: string | null
          quantity_shipped?: number
          scanned_at?: string | null
          scanned_by?: string | null
          shipment_id?: string
          stock_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_shipment_items_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "logistics_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_shipment_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_shipments: {
        Row: {
          base_destination_id: string | null
          base_origin_id: string | null
          carrier: string | null
          created_at: string
          created_by: string | null
          estimated_arrival_date: string | null
          id: string
          notes: string | null
          prepared_by: string | null
          shipment_number: string
          shipped_date: string | null
          status: string
          total_packages: number | null
          total_weight: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          base_destination_id?: string | null
          base_origin_id?: string | null
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          estimated_arrival_date?: string | null
          id?: string
          notes?: string | null
          prepared_by?: string | null
          shipment_number: string
          shipped_date?: string | null
          status?: string
          total_packages?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          base_destination_id?: string | null
          base_origin_id?: string | null
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          estimated_arrival_date?: string | null
          id?: string
          notes?: string | null
          prepared_by?: string | null
          shipment_number?: string
          shipped_date?: string | null
          status?: string
          total_packages?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_shipments_base_destination_id_fkey"
            columns: ["base_destination_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_shipments_base_origin_id_fkey"
            columns: ["base_origin_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_shipments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          status: Database["public"]["Enums"]["order_status"] | null
          supplier_id: string | null
          total_amount: number | null
          tracking_url: string | null
          urgency_level: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_id?: string | null
          boat_id?: string | null
          bulk_purchase_type?: string | null
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
          status?: Database["public"]["Enums"]["order_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_url?: string | null
          urgency_level?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_id?: string | null
          boat_id?: string | null
          bulk_purchase_type?: string | null
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
          status?: Database["public"]["Enums"]["order_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
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
      profile_audit_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          profile_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          profile_id: string
        }
        Update: {
          action?: string
          changed_by?: string
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
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          base_id?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          base_id?: string | null
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
      purchasing_workflows: {
        Row: {
          approval_history: Json
          created_at: string
          created_by: string
          current_step: string
          id: string
          order_id: string
          steps: Json
          updated_at: string
          workflow_type: string
        }
        Insert: {
          approval_history?: Json
          created_at?: string
          created_by: string
          current_step?: string
          id?: string
          order_id: string
          steps?: Json
          updated_at?: string
          workflow_type?: string
        }
        Update: {
          approval_history?: Json
          created_at?: string
          created_by?: string
          current_step?: string
          id?: string
          order_id?: string
          steps?: Json
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchasing_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchasing_workflows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
            foreignKeyName: "stock_items_last_supplier_id_fkey"
            columns: ["last_supplier_id"]
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
        ]
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
        ]
      }
    }
    Functions: {
      calculate_next_maintenance_date: {
        Args: {
          last_date: string
          interval_value: number
          interval_unit: string
        }
        Returns: string
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      evaluate_weather_for_maintenance: {
        Args: { maintenance_date: string; base_id_param: string }
        Returns: Json
      }
      generate_receipt_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_shipment_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_stock_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_base_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      refresh_purchasing_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
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
      ],
      user_role: ["direction", "chef_base", "technicien"],
    },
  },
} as const
