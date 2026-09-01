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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          requested_at: string
          transfer_plan: Json
          user_id: string
        }
        Insert: {
          requested_at?: string
          transfer_plan?: Json
          user_id: string
        }
        Update: {
          requested_at?: string
          transfer_plan?: Json
          user_id?: string
        }
        Relationships: []
      }
      app_event_log: {
        Row: {
          created_at: string
          error_code: string | null
          event_name: string
          id: string
          is_test: boolean
          metadata: Json
          role: string | null
          route: string | null
          status: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          event_name: string
          id?: string
          is_test?: boolean
          metadata?: Json
          role?: string | null
          route?: string | null
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          event_name?: string
          id?: string
          is_test?: boolean
          metadata?: Json
          role?: string | null
          route?: string | null
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_event_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "assessments_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_access_audit: {
        Row: {
          action: string
          approved_by: string | null
          created_at: string
          id: string
          previous_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          approved_by?: string | null
          created_at?: string
          id?: string
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          approved_by?: string | null
          created_at?: string
          id?: string
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_access_audit_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_transfer_observations: {
        Row: {
          assignment_id: string
          collected_at: string
          consent_version: string
          consented_at: string
          created_at: string
          day_number: number
          domain_id: string
          event_type: string
          id: string
          is_test: boolean
          not_observed: boolean
          program_instance_id: string
          program_run_id: string | null
          protocol_version: string
          response_duration_ms: number | null
          score: number | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          collected_at?: string
          consent_version: string
          consented_at: string
          created_at?: string
          day_number: number
          domain_id: string
          event_type: string
          id?: string
          is_test?: boolean
          not_observed?: boolean
          program_instance_id: string
          program_run_id?: string | null
          protocol_version: string
          response_duration_ms?: number | null
          score?: number | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          collected_at?: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          day_number?: number
          domain_id?: string
          event_type?: string
          id?: string
          is_test?: boolean
          not_observed?: boolean
          program_instance_id?: string
          program_run_id?: string | null
          protocol_version?: string
          response_duration_ms?: number | null
          score?: number | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_transfer_observations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "user_day_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_observations_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_observations_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfer_observations_protocol_version_fkey"
            columns: ["protocol_version"]
            isOneToOne: false
            referencedRelation: "evidence_protocols"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "athlete_transfer_observations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      coach_evidence_observations: {
        Row: {
          created_at: string
          domain_id: string
          not_observed: boolean
          review_id: string
          score: number | null
        }
        Insert: {
          created_at?: string
          domain_id: string
          not_observed?: boolean
          review_id: string
          score?: number | null
        }
        Update: {
          created_at?: string
          domain_id?: string
          not_observed?: boolean
          review_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_evidence_observations_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "coach_evidence_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_evidence_reviews: {
        Row: {
          coach_id: string
          completion_duration_ms: number | null
          created_at: string
          id: string
          is_test: boolean
          observation_context: string
          observed_athlete_count: number
          program_run_id: string
          protocol_version: string
          scope_type: string
          target_program_instance_id: string | null
          team_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          coach_id: string
          completion_duration_ms?: number | null
          created_at?: string
          id?: string
          is_test?: boolean
          observation_context: string
          observed_athlete_count: number
          program_run_id: string
          protocol_version: string
          scope_type: string
          target_program_instance_id?: string | null
          team_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          coach_id?: string
          completion_duration_ms?: number | null
          created_at?: string
          id?: string
          is_test?: boolean
          observation_context?: string
          observed_athlete_count?: number
          program_run_id?: string
          protocol_version?: string
          scope_type?: string
          target_program_instance_id?: string | null
          team_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_evidence_reviews_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_evidence_reviews_protocol_version_fkey"
            columns: ["protocol_version"]
            isOneToOne: false
            referencedRelation: "evidence_protocols"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "coach_evidence_reviews_target_program_instance_id_fkey"
            columns: ["target_program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_evidence_reviews_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "comprehension_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
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
        Relationships: [
          {
            foreignKeyName: "daily_checkins_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "daily_journals_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_profile_assessments: {
        Row: {
          answers: Json
          created_at: string
          id: string
          instrument_id: string | null
          program_instance_id: string | null
          questionnaire_version: string | null
          scores: Json
          session_id: string
          timing: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          instrument_id?: string | null
          program_instance_id?: string | null
          questionnaire_version?: string | null
          scores?: Json
          session_id: string
          timing: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          instrument_id?: string | null
          program_instance_id?: string | null
          questionnaire_version?: string | null
          scores?: Json
          session_id?: string
          timing?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deep_profile_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_api_access_log: {
        Row: {
          client_id: string
          evidence_data_lock_id: string | null
          id: string
          outcome: string
          request_id: string
          requested_at: string
          response_checksum: string | null
        }
        Insert: {
          client_id: string
          evidence_data_lock_id?: string | null
          id?: string
          outcome: string
          request_id: string
          requested_at?: string
          response_checksum?: string | null
        }
        Update: {
          client_id?: string
          evidence_data_lock_id?: string | null
          id?: string
          outcome?: string
          request_id?: string
          requested_at?: string
          response_checksum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_api_access_log_evidence_data_lock_id_fkey"
            columns: ["evidence_data_lock_id"]
            isOneToOne: false
            referencedRelation: "evidence_data_locks"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_data_locks: {
        Row: {
          analysis_manifest: Json
          checksum_algorithm: string
          content_checksum: string
          evidence_payload: Json
          id: string
          include_test: boolean
          invalidated_at: string | null
          invalidated_by: string | null
          invalidation_reason: string | null
          locked_at: string
          locked_by: string | null
          program_run_id: string | null
          protocol_version: string
          scope_type: string
          snapshot_schema_version: string
          source_cutoff: string
          sport_category: string | null
          sport_level: string | null
          status: string
        }
        Insert: {
          analysis_manifest: Json
          checksum_algorithm?: string
          content_checksum: string
          evidence_payload: Json
          id?: string
          include_test?: boolean
          invalidated_at?: string | null
          invalidated_by?: string | null
          invalidation_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          program_run_id?: string | null
          protocol_version: string
          scope_type: string
          snapshot_schema_version: string
          source_cutoff: string
          sport_category?: string | null
          sport_level?: string | null
          status?: string
        }
        Update: {
          analysis_manifest?: Json
          checksum_algorithm?: string
          content_checksum?: string
          evidence_payload?: Json
          id?: string
          include_test?: boolean
          invalidated_at?: string | null
          invalidated_by?: string | null
          invalidation_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          program_run_id?: string | null
          protocol_version?: string
          scope_type?: string
          snapshot_schema_version?: string
          source_cutoff?: string
          sport_category?: string | null
          sport_level?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_data_locks_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_eligibility_audit: {
        Row: {
          actor_id: string | null
          athlete_assent_version: string | null
          created_at: string
          guardian_consent_version: string | null
          id: string
          program_instance_id: string
          status: string
          verification_basis: string
        }
        Insert: {
          actor_id?: string | null
          athlete_assent_version?: string | null
          created_at?: string
          guardian_consent_version?: string | null
          id?: string
          program_instance_id: string
          status: string
          verification_basis?: string
        }
        Update: {
          actor_id?: string | null
          athlete_assent_version?: string | null
          created_at?: string
          guardian_consent_version?: string | null
          id?: string
          program_instance_id?: string
          status?: string
          verification_basis?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_eligibility_audit_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_participation_eligibility: {
        Row: {
          athlete_assent_version: string | null
          created_at: string
          guardian_consent_version: string | null
          program_instance_id: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
          verification_basis: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          athlete_assent_version?: string | null
          created_at?: string
          guardian_consent_version?: string | null
          program_instance_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          status: string
          updated_at?: string
          verification_basis?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          athlete_assent_version?: string | null
          created_at?: string
          guardian_consent_version?: string | null
          program_instance_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          verification_basis?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_participation_eligibility_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: true
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_protocols: {
        Row: {
          athlete_collection_enabled: boolean
          coach_collection_enabled: boolean
          created_at: string
          minor_collection_enabled: boolean
          program_days: number
          required_athlete_assent_version: string | null
          required_consent_version: string
          required_guardian_consent_version: string | null
          status: string
          version: string
        }
        Insert: {
          athlete_collection_enabled?: boolean
          coach_collection_enabled?: boolean
          created_at?: string
          minor_collection_enabled?: boolean
          program_days: number
          required_athlete_assent_version?: string | null
          required_consent_version: string
          required_guardian_consent_version?: string | null
          status: string
          version: string
        }
        Update: {
          athlete_collection_enabled?: boolean
          coach_collection_enabled?: boolean
          created_at?: string
          minor_collection_enabled?: boolean
          program_days?: number
          required_athlete_assent_version?: string | null
          required_consent_version?: string
          required_guardian_consent_version?: string | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      evidence_transfer_schedule: {
        Row: {
          day_number: number
          domain_id: string
          protocol_version: string
          replaces_optional_reflection: boolean
          target_seconds: number
        }
        Insert: {
          day_number: number
          domain_id: string
          protocol_version: string
          replaces_optional_reflection?: boolean
          target_seconds: number
        }
        Update: {
          day_number?: number
          domain_id?: string
          protocol_version?: string
          replaces_optional_reflection?: boolean
          target_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_transfer_schedule_protocol_version_fkey"
            columns: ["protocol_version"]
            isOneToOne: false
            referencedRelation: "evidence_protocols"
            referencedColumns: ["version"]
          },
        ]
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
      mahleos_operations_access_log: {
        Row: {
          client_id: string
          id: string
          outcome: string
          program_run_id: string | null
          request_id: string
          requested_at: string
          response_checksum: string | null
          view_name: string
        }
        Insert: {
          client_id: string
          id?: string
          outcome: string
          program_run_id?: string | null
          request_id: string
          requested_at?: string
          response_checksum?: string | null
          view_name: string
        }
        Update: {
          client_id?: string
          id?: string
          outcome?: string
          program_run_id?: string | null
          request_id?: string
          requested_at?: string
          response_checksum?: string | null
          view_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mahleos_operations_access_log_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string
          error_code: number | null
          failed_at: string | null
          id: string
          metadata: Json
          notification_type: string
          opened_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          sent_date: string
          status: string
          target_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: number | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          notification_type: string
          opened_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_date: string
          status?: string
          target_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: number | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          notification_type?: string
          opened_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_date?: string
          status?: string
          target_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      native_push_devices: {
        Row: {
          created_at: string
          device_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          id?: string
          platform?: string
          updated_at?: string
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
          data_contribution_consent: boolean | null
          data_contribution_consent_version: string | null
          data_contribution_consented_at: string | null
          data_contribution_updated_at: string | null
          full_name: string | null
          id: string
          is_test_user: boolean
          position: string | null
          sport: string | null
          sport_category: string | null
          sport_format: string | null
          sport_level: string | null
          sport_taxonomy_version: string | null
          team: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_contribution_consent?: boolean | null
          data_contribution_consent_version?: string | null
          data_contribution_consented_at?: string | null
          data_contribution_updated_at?: string | null
          full_name?: string | null
          id: string
          is_test_user?: boolean
          position?: string | null
          sport?: string | null
          sport_category?: string | null
          sport_format?: string | null
          sport_level?: string | null
          sport_taxonomy_version?: string | null
          team?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_contribution_consent?: boolean | null
          data_contribution_consent_version?: string | null
          data_contribution_consented_at?: string | null
          data_contribution_updated_at?: string | null
          full_name?: string | null
          id?: string
          is_test_user?: boolean
          position?: string | null
          sport?: string | null
          sport_category?: string | null
          sport_format?: string | null
          sport_level?: string | null
          sport_taxonomy_version?: string | null
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
          is_test_instance: boolean
          program_run_id: string | null
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
          is_test_instance?: boolean
          program_run_id?: string | null
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
          is_test_instance?: boolean
          program_run_id?: string | null
          started_at?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_instances_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "snapshots_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      program_runs: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          metadata: Json
          name: string
          started_at: string | null
          status: string
          team_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          name: string
          started_at?: string | null
          status?: string
          team_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          started_at?: string | null
          status?: string
          team_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          pre_training_minutes: number
          timezone: string
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
          pre_training_minutes?: number
          timezone?: string
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
          pre_training_minutes?: number
          timezone?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_time_overrides: {
        Row: {
          created_at: string
          created_by: string
          id: string
          scope: string
          simulated_date: string
          simulated_day_number: number | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          scope: string
          simulated_date: string
          simulated_day_number?: number | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          scope?: string
          simulated_date?: string
          simulated_day_number?: number | null
          team_id?: string | null
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
          instrument_id: string | null
          is_complete: boolean
          last_category_index: number
          program_instance_id: string | null
          progress_updated_at: string
          questionnaire_version: string | null
          scores: Json
          session_id: string
          timing: string
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          instrument_id?: string | null
          is_complete?: boolean
          last_category_index?: number
          program_instance_id?: string | null
          progress_updated_at?: string
          questionnaire_version?: string | null
          scores?: Json
          session_id: string
          timing?: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          answers?: Json
          created_at?: string
          id?: string
          instrument_id?: string | null
          is_complete?: boolean
          last_category_index?: number
          program_instance_id?: string | null
          progress_updated_at?: string
          questionnaire_version?: string | null
          scores?: Json
          session_id?: string
          timing?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      study_aggregate_snapshots: {
        Row: {
          claim_boundary: string
          cohort_id: string | null
          data_quality: Json
          generated_at: string
          generated_by: string | null
          id: string
          metrics: Json
          n_active: number
          n_participants: number
          privacy_level: string
        }
        Insert: {
          claim_boundary?: string
          cohort_id?: string | null
          data_quality?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          metrics?: Json
          n_active?: number
          n_participants?: number
          privacy_level?: string
        }
        Update: {
          claim_boundary?: string
          cohort_id?: string | null
          data_quality?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          metrics?: Json
          n_active?: number
          n_participants?: number
          privacy_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_aggregate_snapshots_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "study_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_aggregate_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_cohorts: {
        Row: {
          cohort_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          include_test_data: boolean
          min_aggregate_n: number
          name: string
          organization: string | null
          sport: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cohort_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          include_test_data?: boolean
          min_aggregate_n?: number
          name: string
          organization?: string | null
          sport?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cohort_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          include_test_data?: boolean
          min_aggregate_n?: number
          name?: string
          organization?: string | null
          sport?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_evidence_snapshots: {
        Row: {
          claim_boundary: string
          cohort_id: string | null
          data_quality: Json
          generated_at: string
          generated_by: string | null
          id: string
          include_test: boolean
          metrics: Json
          n_active: number
          n_participants: number
          outcome_summary: Json
          privacy_level: string
          program_run_id: string | null
          readiness_stage: string
          scope_id: string | null
          scope_type: string
        }
        Insert: {
          claim_boundary?: string
          cohort_id?: string | null
          data_quality?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          include_test?: boolean
          metrics?: Json
          n_active?: number
          n_participants?: number
          outcome_summary?: Json
          privacy_level?: string
          program_run_id?: string | null
          readiness_stage: string
          scope_id?: string | null
          scope_type?: string
        }
        Update: {
          claim_boundary?: string
          cohort_id?: string | null
          data_quality?: Json
          generated_at?: string
          generated_by?: string | null
          id?: string
          include_test?: boolean
          metrics?: Json
          n_active?: number
          n_participants?: number
          outcome_summary?: Json
          privacy_level?: string
          program_run_id?: string | null
          readiness_stage?: string
          scope_id?: string | null
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_evidence_snapshots_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "study_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_evidence_snapshots_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_evidence_snapshots_program_run_id_fkey"
            columns: ["program_run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_export_manifests: {
        Row: {
          claim_boundary: string
          cohort_id: string | null
          export_type: string
          generated_at: string
          generated_by: string | null
          id: string
          included_exports: string[]
          metadata: Json
          privacy_exclusions: string[]
          snapshot_id: string | null
          source_version: string
        }
        Insert: {
          claim_boundary?: string
          cohort_id?: string | null
          export_type?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          included_exports?: string[]
          metadata?: Json
          privacy_exclusions?: string[]
          snapshot_id?: string | null
          source_version?: string
        }
        Update: {
          claim_boundary?: string
          cohort_id?: string | null
          export_type?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          included_exports?: string[]
          metadata?: Json
          privacy_exclusions?: string[]
          snapshot_id?: string | null
          source_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_export_manifests_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "study_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_export_manifests_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_export_manifests_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "study_aggregate_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      study_measurement_windows: {
        Row: {
          actual_completed_count: number
          cohort_id: string
          created_at: string
          id: string
          label: string
          planned_end_date: string | null
          planned_start_date: string | null
          status: string
          target_count: number
          updated_at: string
        }
        Insert: {
          actual_completed_count?: number
          cohort_id: string
          created_at?: string
          id?: string
          label: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          status?: string
          target_count?: number
          updated_at?: string
        }
        Update: {
          actual_completed_count?: number
          cohort_id?: string
          created_at?: string
          id?: string
          label?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          status?: string
          target_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_measurement_windows_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "study_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      study_outcome_definitions: {
        Row: {
          claim_boundary: string
          created_at: string
          direction: string
          display_order: number
          domain: string
          id: string
          label: string
          min_aggregate_n: number
          source_field: string | null
          source_table: string
          updated_at: string
        }
        Insert: {
          claim_boundary?: string
          created_at?: string
          direction?: string
          display_order?: number
          domain: string
          id: string
          label: string
          min_aggregate_n?: number
          source_field?: string | null
          source_table: string
          updated_at?: string
        }
        Update: {
          claim_boundary?: string
          created_at?: string
          direction?: string
          display_order?: number
          domain?: string
          id?: string
          label?: string
          min_aggregate_n?: number
          source_field?: string | null
          source_table?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_participants: {
        Row: {
          anonymized_key: string
          cohort_id: string
          consent_status: string
          created_at: string
          exclusion_reason: string | null
          id: string
          included: boolean
          program_instance_id: string | null
          role: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          anonymized_key?: string
          cohort_id: string
          consent_status?: string
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          included?: boolean
          program_instance_id?: string | null
          role?: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          anonymized_key?: string
          cohort_id?: string
          consent_status?: string
          created_at?: string
          exclusion_reason?: string | null
          id?: string
          included?: boolean
          program_instance_id?: string | null
          role?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_participants_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "study_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_participants_program_instance_id_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          event_type: string
          id: string
          team_id: string
          title: string | null
          training_local_hour: number | null
          training_local_minute: number | null
          training_timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          event_type: string
          id?: string
          team_id: string
          title?: string | null
          training_local_hour?: number | null
          training_local_minute?: number | null
          training_timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          event_type?: string
          id?: string
          team_id?: string
          title?: string | null
          training_local_hour?: number | null
          training_local_minute?: number | null
          training_timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      team_training_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          id: string
          team_id: string
          training_local_hour: number
          training_local_minute: number
          training_timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          id?: string
          team_id: string
          training_local_hour: number
          training_local_minute?: number
          training_timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          id?: string
          team_id?: string
          training_local_hour?: number
          training_local_minute?: number
          training_timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_training_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_training_schedule_team_id_fkey"
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
          is_archived: boolean
          is_test_team: boolean
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
          is_archived?: boolean
          is_test_team?: boolean
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
          is_archived?: boolean
          is_test_team?: boolean
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
          training_local_hour: number | null
          training_local_minute: number
          training_timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          training_hour: number
          training_local_hour?: number | null
          training_local_minute?: number
          training_timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          training_hour?: number
          training_local_hour?: number | null
          training_local_minute?: number
          training_timezone?: string
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
          {
            foreignKeyName: "user_day_completion_program_instance_fkey"
            columns: ["program_instance_id"]
            isOneToOne: false
            referencedRelation: "program_instances"
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
      activate_team_program_v1_3: {
        Args: { _started_at: string; _team_id: string }
        Returns: Json
      }
      activate_team_program_run: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      approve_coach_access: {
        Args: {
          _new_team_name?: string | null
          _new_team_sport?: string | null
          _team_id?: string | null
          _user_id: string
        }
        Returns: Json
      }
      archive_qa_cohort: { Args: { _team_id: string }; Returns: Json }
      assign_team_members_to_program_run: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      can_manage_team_calendar: { Args: { _team_id: string }; Returns: boolean }
      can_manage_team_program_runs: {
        Args: { _team_id: string }
        Returns: boolean
      }
      compute_team_outcomes: {
        Args: { min_n?: number; team_id_param: string }
        Returns: Json
      }
      create_nlz_evidence_snapshot: {
        Args: { cohort_id?: string; include_test?: boolean }
        Returns: Json
      }
      create_evidence_data_lock: {
        Args: {
          _include_test?: boolean
          _program_run_id?: string | null
          _protocol_version?: string
          _sport_category?: string
          _sport_level?: string
        }
        Returns: Json
      }
      create_nlz_program_run_snapshot: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      create_study_aggregate_snapshot: {
        Args: { _cohort_id?: string; include_test?: boolean }
        Returns: Json
      }
      create_team_program_run: {
        Args: { _name: string; _started_at?: string; _team_id: string }
        Returns: Json
      }
      evidence_eligibility_reason: {
        Args: { _program_instance_id: string; _protocol_version: string }
        Returns: string
      }
      find_coach_access_candidate: {
        Args: { _email: string }
        Returns: Json
      }
      get_active_team_program_run: { Args: { _team_id: string }; Returns: Json }
      get_admin_evidence_eligibility: {
        Args: { _include_test?: boolean }
        Returns: Json
      }
      get_admin_comprehension_insights: {
        Args: { _include_test?: boolean }
        Returns: Json
      }
      get_admin_evidence_quality: {
        Args: { include_test?: boolean }
        Returns: Json
      }
      get_admin_evidence_workbench_v1_4: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      get_admin_nlz_evidence_dossier: {
        Args: { cohort_id?: string; include_test?: boolean }
        Returns: Json
      }
      get_admin_ops_status: { Args: { include_test?: boolean }; Returns: Json }
      get_admin_overview_stats:
        | { Args: never; Returns: Json }
        | { Args: { include_test?: boolean }; Returns: Json }
      get_admin_presentation_metrics: {
        Args: { include_test?: boolean }
        Returns: Json
      }
      get_admin_study_overview: {
        Args: { include_test?: boolean }
        Returns: Json
      }
      get_admin_system_health: { Args: never; Returns: Json }
      get_admin_teams_summary:
        | { Args: never; Returns: Json }
        | { Args: { include_test?: boolean }; Returns: Json }
      get_coach_evidence_review_context: {
        Args: { _protocol_version?: string; _team_id: string }
        Returns: Json
      }
      get_coach_team_development_v1_4: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      get_coach_team_activity_status: {
        Args: { _team_id: string }
        Returns: {
          checkins_last_7d: number
          completion_rate: number
          current_streak: number
          days_available: number
          days_completed: number
          full_name: string
          inactive_risk: boolean
          journal_entries_count: number
          last_activity_at: string
          last_checkin_date: string
          user_id: string
        }[]
      }
      get_coach_team_checkin_status_v1_4: {
        Args: { _team_id: string }
        Returns: {
          already_reminded_today: boolean
          full_name: string | null
          program_instance_id: string | null
          program_local_date: string
          rolling_7_available: number
          rolling_7_completed: number
          rolling_7_rate: number
          supported_push_channels: string[]
          today_checkin_at: string | null
          today_checkin_completed: boolean
          user_id: string
        }[]
      }
      get_effective_today: { Args: { _user_id: string }; Returns: string }
      get_evidence_report_v1_4: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      get_evidence_data_lock: { Args: { _lock_id: string }; Returns: Json }
      get_my_evidence_status: {
        Args: {
          _day_number: number
          _event_type: string
          _program_instance_id: string
          _protocol_version: string
        }
        Returns: Json
      }
      get_my_longitudinal_evidence_v1_4: { Args: never; Returns: Json }
      get_my_transfer_evidence_summary: {
        Args: { _program_instance_id: string; _protocol_version?: string }
        Returns: Json
      }
      get_nlz_evidence_dossier: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      get_program_run_development_evidence: {
        Args: { _program_run_id: string; _protocol_version?: string }
        Returns: Json
      }
      get_nlz_pilot_readiness: {
        Args: { _program_run_id?: string; _team_id?: string }
        Returns: Json
      }
      get_performance_evidence_summary: {
        Args: {
          _include_test?: boolean
          _program_run_id?: string
          _protocol_version?: string
        }
        Returns: Json
      }
      get_solo_sport_evidence_summary: {
        Args: {
          _include_test?: boolean
          _protocol_version?: string
          _sport_category?: string
          _sport_level?: string
        }
        Returns: Json
      }
      get_solo_development_evidence_summary: {
        Args: {
          _include_test?: boolean
          _protocol_version?: string
          _sport_category?: string
          _sport_level?: string
        }
        Returns: Json
      }
      get_qa_evidence_parity: {
        Args: { _program_run_id: string; _protocol_version?: string }
        Returns: Json
      }
      get_team_program_run_status: {
        Args: { _program_run_id: string }
        Returns: Json
      }
      get_team_mental_state_aggregate: {
        Args: { _protocol_version?: string; _team_id: string }
        Returns: Json
      }
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
      invalidate_evidence_data_lock: {
        Args: { _lock_id: string; _reason: string }
        Returns: Json
      }
      join_team_by_code: { Args: { _code: string }; Returns: Json }
      join_team_by_code_v1_3: {
        Args: { _code: string; _confirm_solo_transition?: boolean }
        Returns: Json
      }
      save_coach_evidence_review: {
        Args: {
          _completion_duration_ms?: number
          _context: string
          _observations: Json
          _program_instance_id: string
          _protocol_version: string
          _scope: string
          _team_id: string
          _week_number: number
        }
        Returns: Json
      }
      save_daily_tracking_v2: {
        Args: {
          _assignment_id: string
          _comprehension_questions?: Json
          _comprehension_results?: Json
          _date: string
          _day_number: number
          _energy_level?: number
          _event_type: string
          _focus_rating?: number
          _mood_before?: number
          _motivation?: number
          _physical_readiness?: number
          _pressure?: number
          _program_instance_id: string
          _recovery?: number
          _reflection?: string
          _sleep_quality?: number
          _stress?: number
          _tasks_completed?: Json
          _team_connection?: number
          _variant_used: string
        }
        Returns: Json
      }
      refresh_my_program_progress_snapshot: {
        Args: { _program_instance_id?: string }
        Returns: Json
      }
      read_evidence_data_lock_for_export: {
        Args: {
          _client_id: string
          _lock_id?: string
          _program_run_id?: string
          _request_id: string
          _scope_type?: string
          _sport_category?: string
          _sport_level?: string
        }
        Returns: Json
      }
      read_mahleos_operational_view: {
        Args: {
          _client_id: string
          _program_run_id?: string
          _request_id: string
          _view_name?: string
        }
        Returns: Json
      }
      save_daily_tracking_v3: {
        Args: {
          _assignment_id: string
          _comprehension_questions?: Json
          _comprehension_results?: Json
          _date: string
          _day_number: number
          _energy_level?: number
          _event_type: string
          _evidence_domain_id?: string
          _evidence_protocol_version?: string
          _evidence_response?: string
          _evidence_response_duration_ms?: number
          _focus_rating?: number
          _mood_before?: number
          _motivation?: number
          _physical_readiness?: number
          _pressure?: number
          _program_instance_id: string
          _recovery?: number
          _reflection?: string
          _sleep_quality?: number
          _stress?: number
          _tasks_completed?: Json
          _team_connection?: number
          _variant_used: string
        }
        Returns: Json
      }
      set_evidence_adult_eligibility: {
        Args: { _program_instance_id: string; _verified: boolean }
        Returns: Json
      }
      set_team_program_run_status: {
        Args: { _program_run_id: string; _status: string }
        Returns: Json
      }
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
