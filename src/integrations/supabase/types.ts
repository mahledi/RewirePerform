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
      assessments: {
        Row: {
          answers: Json
          assessment_type: string
          created_at: string
          id: string
          scores: Json | null
          session_id: string
          timing: string
          total_score: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json
          assessment_type: string
          created_at?: string
          id?: string
          scores?: Json | null
          session_id: string
          timing: string
          total_score?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          assessment_type?: string
          created_at?: string
          id?: string
          scores?: Json | null
          session_id?: string
          timing?: string
          total_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          date: string
          event_type: string
          id: string
          notes: string | null
          session_id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          event_type: string
          id?: string
          notes?: string | null
          session_id: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          event_type?: string
          id?: string
          notes?: string | null
          session_id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          energy_level: number | null
          event_type: string
          focus_rating: number | null
          id: string
          mood_before: number | null
          reflection: string | null
          session_id: string
          tasks_completed: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          energy_level?: number | null
          event_type: string
          focus_rating?: number | null
          id?: string
          mood_before?: number | null
          reflection?: string | null
          session_id: string
          tasks_completed?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number | null
          event_type?: string
          focus_rating?: number | null
          id?: string
          mood_before?: number | null
          reflection?: string | null
          session_id?: string
          tasks_completed?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_journals: {
        Row: {
          answers: Json
          created_at: string
          date: string
          day_number: number | null
          free_reflection: string | null
          gratitude: string | null
          id: string
          journal_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          date: string
          day_number?: number | null
          free_reflection?: string | null
          gratitude?: string | null
          id?: string
          journal_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          date?: string
          day_number?: number | null
          free_reflection?: string | null
          gratitude?: string | null
          id?: string
          journal_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deep_profile_assessments: {
        Row: {
          answers: Json
          created_at: string
          id: string
          session_id: string
          timing: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          session_id: string
          timing: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          session_id?: string
          timing?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personalized_tasks: {
        Row: {
          date: string
          event_type: string
          generated_at: string
          id: string
          session_id: string
          tasks: Json
          user_id: string | null
        }
        Insert: {
          date: string
          event_type: string
          generated_at?: string
          id?: string
          session_id: string
          tasks?: Json
          user_id?: string | null
        }
        Update: {
          date?: string
          event_type?: string
          generated_at?: string
          id?: string
          session_id?: string
          tasks?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          sport: string | null
          team: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          sport?: string | null
          team?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          sport?: string | null
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_settings: {
        Row: {
          competition_date: string | null
          competition_name: string | null
          created_at: string
          id: string
          program_start: string
          program_weeks: number
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          competition_date?: string | null
          competition_name?: string | null
          created_at?: string
          id?: string
          program_start?: string
          program_weeks?: number
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          competition_date?: string | null
          competition_name?: string | null
          created_at?: string
          id?: string
          program_start?: string
          program_weeks?: number
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          analysis: Json | null
          answers: Json
          created_at: string
          id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          access_code: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          sport: string | null
        }
        Insert: {
          access_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          sport?: string | null
        }
        Update: {
          access_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          sport?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_team_stats: { Args: { team_id_param: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "athlete" | "coach"
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
      app_role: ["athlete", "coach"],
    },
  },
} as const
