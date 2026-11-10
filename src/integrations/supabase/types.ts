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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string
          service_id: string
        }
        Insert: {
          appointment_id: string
          service_id: string
        }
        Update: {
          appointment_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_duration: number | null
          behavior_during_visit: string | null
          created_at: string
          date: string
          dog_id: string
          groomer_id: string
          haircut_notes: string | null
          id: string
          notes: string | null
          paid_by_card: boolean
          planned_duration: number
          price: number
          status: string
          time: string
        }
        Insert: {
          actual_duration?: number | null
          behavior_during_visit?: string | null
          created_at?: string
          date: string
          dog_id: string
          groomer_id: string
          haircut_notes?: string | null
          id?: string
          notes?: string | null
          paid_by_card?: boolean
          planned_duration?: number
          price?: number
          status?: string
          time: string
        }
        Update: {
          actual_duration?: number | null
          behavior_during_visit?: string | null
          created_at?: string
          date?: string
          dog_id?: string
          groomer_id?: string
          haircut_notes?: string | null
          id?: string
          notes?: string | null
          paid_by_card?: boolean
          planned_duration?: number
          price?: number
          status?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          description: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          salon_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          salon_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          description?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          salon_id?: string | null
        }
        Relationships: []
      }
      cash_closings: {
        Row: {
          counted: number
          created_at: string
          date: string
          expected: number
          id: string
          note: string | null
          salon_id: string
        }
        Insert: {
          counted?: number
          created_at?: string
          date: string
          expected?: number
          id?: string
          note?: string | null
          salon_id: string
        }
        Update: {
          counted?: number
          created_at?: string
          date?: string
          expected?: number
          id?: string
          note?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_operations: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          note: string | null
          salon_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          salon_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          salon_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_operations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      client_dogs: {
        Row: {
          client_id: string
          dog_id: string
        }
        Insert: {
          client_id: string
          dog_id: string
        }
        Update: {
          client_id?: string
          dog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_dogs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_dogs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          additional_contacts: Json
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          language: string
          name: string
          notes: string | null
          phone: string | null
          preferred_contact: string
          preferred_salon_id: string | null
          review_taken: boolean
        }
        Insert: {
          additional_contacts?: Json
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          language?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_contact?: string
          preferred_salon_id?: string | null
          review_taken?: boolean
        }
        Update: {
          additional_contacts?: Json
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          language?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_contact?: string
          preferred_salon_id?: string | null
          review_taken?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clients_preferred_salon_id_fkey"
            columns: ["preferred_salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          age: number | null
          behavior: string
          breed: string | null
          brushes_teeth: boolean
          coat: string
          coat_status: string | null
          created_at: string
          extra_notes: string[]
          grooming_instructions: string | null
          health_status: string | null
          height: number | null
          id: string
          is_healthy: boolean
          name: string
          notes: string | null
          owner_id: string | null
          photo_path: string | null
          photo_url: string | null
          pinned_groomer_id: string | null
          preferred_additional_services: string[]
          sex: string | null
          size: string
          toothbrush_number: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          behavior?: string
          breed?: string | null
          brushes_teeth?: boolean
          coat?: string
          coat_status?: string | null
          created_at?: string
          extra_notes?: string[]
          grooming_instructions?: string | null
          health_status?: string | null
          height?: number | null
          id?: string
          is_healthy?: boolean
          name: string
          notes?: string | null
          owner_id?: string | null
          photo_path?: string | null
          photo_url?: string | null
          pinned_groomer_id?: string | null
          preferred_additional_services?: string[]
          sex?: string | null
          size?: string
          toothbrush_number?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          behavior?: string
          breed?: string | null
          brushes_teeth?: boolean
          coat?: string
          coat_status?: string | null
          created_at?: string
          extra_notes?: string[]
          grooming_instructions?: string | null
          health_status?: string | null
          height?: number | null
          id?: string
          is_healthy?: boolean
          name?: string
          notes?: string | null
          owner_id?: string | null
          photo_path?: string | null
          photo_url?: string | null
          pinned_groomer_id?: string | null
          preferred_additional_services?: string[]
          sex?: string | null
          size?: string
          toothbrush_number?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_pinned_groomer_id_fkey"
            columns: ["pinned_groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
        ]
      }
      groomers: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          salon_id: string
          specialties: string[]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          salon_id: string
          specialties?: string[]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          salon_id?: string
          specialties?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "groomers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          language: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          language?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          language?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reactivation_contacts: {
        Row: {
          contacted_at: string
          created_at: string
          dog_id: string
          id: string
          note: string | null
          reason: string | null
          remind_on: string | null
          result: string
        }
        Insert: {
          contacted_at?: string
          created_at?: string
          dog_id: string
          id?: string
          note?: string | null
          reason?: string | null
          remind_on?: string | null
          result?: string
        }
        Update: {
          contacted_at?: string
          created_at?: string
          dog_id?: string
          id?: string
          note?: string | null
          reason?: string | null
          remind_on?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactivation_contacts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          allowed?: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          allowed?: boolean
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      salons: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      shifts: {
        Row: {
          day_of_week: number
          groomer_id: string
          id: string
          value: string
          week_start: string
        }
        Insert: {
          day_of_week: number
          groomer_id: string
          id?: string
          value?: string
          week_start: string
        }
        Update: {
          day_of_week?: number
          groomer_id?: string
          id?: string
          value?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed: boolean
          permission: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          permission: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          groomer_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          groomer_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          groomer_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      groomer_can_see_dog: { Args: { _dog_id: string }; Returns: boolean }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_groomer_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "owner" | "admin" | "groomer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin", "groomer"],
    },
  },
} as const
