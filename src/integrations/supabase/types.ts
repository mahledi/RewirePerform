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
          program_instance_id: string | null
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
          program_instance_id?: string | null
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
          program_instance_id?: string | null
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
      coach_journals: {
        Row: {
          action_commitment: string | null
          coach_id: string
          created_at: string
          gratitude: string | null
          id: string
          reflection_1: string | null
          reflection_2: string | null
          reflection_3: string | null
          team_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          action_commitment?: string | null
          coach_id: string
          created_at?: string
          gratitude?: string | null
          id?: string
          reflection_1?: string | null
          reflection_2?: string | null
          reflection_3?: string | null
          team_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          action_commitment?: string | null
          coach_id?: string
          created_at?: string
          gratitude?: string | null
          id?: string
          reflection_1?: string | null
          reflection_2?: string | null
          reflection_3?: string | null
          team_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      comprehension_check_instances: {
        Row: {
          assignment_id: string
          completed_at: string | null
          correct_count: number | null
          created_at: string
          day_number: number
          generated_questions: Json
          id: string
          program_instance_id: string | null
          results: Json
          status: string
          total_count: number | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          day_number: number
          generated_questions?: Json
          id?: string
          program_instance_id?: string | null
          results?: Json
          status?: string
          total_count?: number | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          day_number?: number
          generated_questions?: Json
          id?: string
          program_instance_id?: string | null
          results?: Json
          status?: string
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprehension_check_instances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "user_day_assignments"
            referencedColumns: ["id"]
          },
        ]
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
          program_instance_id: string | null
          reflection: string | null
          session_id: string
          tasks_completed: Json | null
          user_id: string | null
          wellbeing_metrics: Json
        }
        Insert: {
          created_at?: string
          date: string
          energy_level?: number | null
          event_type: string
          focus_rating?: number | null
          id?: string
          mood_before?: number | null
          program_instance_id?: string | null
          reflection?: string | null
          session_id: string
          tasks_completed?: Json | null
          user_id?: string | null
          wellbeing_metrics?: Json
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number | null
          event_type?: string
          focus_rating?: number | null
          id?: string
          mood_before?: number | null
          program_instance_id?: string | null
          reflection?: string | null
          session_id?: string
          tasks_completed?: Json | null
          user_id?: string | null
          wellbeing_metrics?: Json
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
          program_instance_id: string | null
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
          program_instance_id?: string | null
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
          program_instance_id?: string | null
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
          admin_note: string | null
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          sent_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: string
          sent_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          sent_date?: string
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
          position: string | null
          sport: string | null
          team: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          position?: string | null
          sport?: string | null
          team?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          position?: string | null
          sport?: string | null
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_instances: {
        Row: {
          created_at: string
          cycle_number: number
          ended_at: string | null
          id: string
          started_at: string
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_number?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_number?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_progress_snapshots: {
        Row: {
          checkins_completed_count: number
          completion_rate: number
          comprehension_average: number | null
          created_at: string
          current_streak: number
          date: string
          days_available: number
          days_completed: number
          id: string
          journals_completed_count: number
          longest_streak: number
          program_day: number | null
          program_instance_id: string | null
          tasks_completed_count: number
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checkins_completed_count?: number
          completion_rate?: number
          comprehension_average?: number | null
          created_at?: string
          current_streak?: number
          date: string
          days_available?: number
          days_completed?: number
          id?: string
          journals_completed_count?: number
          longest_streak?: number
          program_day?: number | null
          program_instance_id?: string | null
          tasks_completed_count?: number
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checkins_completed_count?: number
          completion_rate?: number
          comprehension_average?: number | null
          created_at?: string
          current_streak?: number
          date?: string
          days_available?: number
          days_completed?: number
          id?: string
          journals_completed_count?: number
          longest_streak?: number
          program_day?: number | null
          program_instance_id?: string | null
          tasks_completed_count?: number
          team_id?: string | null
          updated_at?: string
          user_id?: string
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          evening_hour: number
          evening_minute: number
          id: string
          morning_hour: number
          morning_minute: number
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          evening_hour?: number
          evening_minute?: number
          id?: string
          morning_hour?: number
          morning_minute?: number
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          evening_hour?: number
          evening_minute?: number
          id?: string
          morning_hour?: number
          morning_minute?: number
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          analysis: Json | null
          answers: Json
          created_at: string
          id: string
          is_complete: boolean
          last_category_index: number
          progress_updated_at: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          is_complete?: boolean
          last_category_index?: number
          progress_updated_at?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          is_complete?: boolean
          last_category_index?: number
          progress_updated_at?: string
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
          coach_access_code: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          program_activated_at: string | null
          program_activated_by: string | null
          program_start_date: string | null
          sport: string | null
        }
        Insert: {
          access_code?: string
          coach_access_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          program_activated_at?: string | null
          program_activated_by?: string | null
          program_start_date?: string | null
          sport?: string | null
        }
        Update: {
          access_code?: string
          coach_access_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          program_activated_at?: string | null
          program_activated_by?: string | null
          program_start_date?: string | null
          sport?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_program_activated_by_fkey"
            columns: ["program_activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          training_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          training_hour: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          training_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_day_assignments: {
        Row: {
          adaptation_summary: Json
          assigned_day_number: number
          assignment_reason: Json
          context_type: string
          created_at: string
          date: string
          generated_payload: Json
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adaptation_summary?: Json
          assigned_day_number: number
          assignment_reason?: Json
          context_type?: string
          created_at?: string
          date: string
          generated_payload?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adaptation_summary?: Json
          assigned_day_number?: number
          assignment_reason?: Json
          context_type?: string
          created_at?: string
          date?: string
          generated_payload?: Json
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_day_completion: {
        Row: {
          assignment_id: string
          completed_at: string | null
          completion_status: string
          created_at: string
          day_number: number
          id: string
          opened_at: string | null
          program_instance_id: string | null
          task_completion: Json
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
          variant_used: string | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          day_number: number
          id?: string
          opened_at?: string | null
          program_instance_id?: string | null
          task_completion?: Json
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
          variant_used?: string | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          day_number?: number
          id?: string
          opened_at?: string | null
          program_instance_id?: string | null
          task_completion?: Json
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
          variant_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_day_completion_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "user_day_assignments"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_user_comprehension: {
        Row: {
          comprehension_average: number | null
          comprehension_count: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
      weekly_user_metrics: {
        Row: {
          avg_energy: number | null
          avg_focus: number | null
          avg_mood: number | null
          checkins_completed_count: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_team_outcomes: {
        Args: { min_n?: number; team_id_param: string }
        Returns: Json
      }
      get_admin_overview_stats: { Args: never; Returns: Json }
      get_admin_system_health: { Args: never; Returns: Json }
      get_admin_teams_summary: { Args: never; Returns: Json }
      get_team_questionnaire_status: {
        Args: { _team_id: string }
        Returns: {
          full_name: string
          is_complete: boolean
          last_category_index: number
          progress_updated_at: string
          user_id: string
        }[]
      }
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
      is_coach_of_user: { Args: { _user_id: string }; Returns: boolean }
      is_creator_of_team: { Args: { _team_id: string }; Returns: boolean }
      is_member_of_team: { Args: { _team_id: string }; Returns: boolean }
      join_team_by_code: { Args: { _code: string }; Returns: Json }
      update_feedback_status: {
        Args: { feedback_id: string; new_note?: string; new_status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "athlete" | "coach" | "admin"
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
      app_role: ["athlete", "coach", "admin"],
    },
  },
} as const
