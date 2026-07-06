// @ts-nocheck
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_records: {
        Row: {
          anamnesis_data: Json | null
          appointment_id: string
          created_at: string
          id: string
          is_first_visit: boolean
          professional_id: string
          registration_number: string | null
          return_date: string | null
          specialty: string | null
          student_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          anamnesis_data?: Json | null
          appointment_id: string
          created_at?: string
          id?: string
          is_first_visit?: boolean
          professional_id: string
          registration_number?: string | null
          return_date?: string | null
          specialty?: string | null
          student_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          anamnesis_data?: Json | null
          appointment_id?: string
          created_at?: string
          id?: string
          is_first_visit?: boolean
          professional_id?: string
          registration_number?: string | null
          return_date?: string | null
          specialty?: string | null
          student_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_records_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_specialty_notes: {
        Row: {
          anamnese: string | null
          appointment_id: string
          aspectos_comunicativos: string | null
          aspectos_emocionais: string | null
          aspectos_sociais: string | null
          avaliacao_especifica: string | null
          created_at: string
          desenvolvimento_neuropsicomotor: string | null
          historico_escolar: string | null
          id: string
          observacoes_comportamentais: string | null
          specialty_id: string | null
          updated_at: string
        }
        Insert: {
          anamnese?: string | null
          appointment_id: string
          aspectos_comunicativos?: string | null
          aspectos_emocionais?: string | null
          aspectos_sociais?: string | null
          avaliacao_especifica?: string | null
          created_at?: string
          desenvolvimento_neuropsicomotor?: string | null
          historico_escolar?: string | null
          id?: string
          observacoes_comportamentais?: string | null
          specialty_id?: string | null
          updated_at?: string
        }
        Update: {
          anamnese?: string | null
          appointment_id?: string
          aspectos_comunicativos?: string | null
          aspectos_emocionais?: string | null
          aspectos_sociais?: string | null
          avaliacao_especifica?: string | null
          created_at?: string
          desenvolvimento_neuropsicomotor?: string | null
          historico_escolar?: string | null
          id?: string
          observacoes_comportamentais?: string | null
          specialty_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_specialty_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_specialty_notes_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          action_plan: string | null
          complaint_id: string | null
          created_at: string
          date: string
          description: string | null
          document_url: string | null
          duration_minutes: number | null
          evolution: string | null
          id: string
          professional_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          complaint_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          document_url?: string | null
          duration_minutes?: number | null
          evolution?: string | null
          id?: string
          professional_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          student_id: string
          type: string
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          complaint_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          document_url?: string | null
          duration_minutes?: number | null
          evolution?: string | null
          id?: string
          professional_id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "school_complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      creditors: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          recurring_amount: number | null
          recurring_day: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          recurring_amount?: number | null
          recurring_day?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          recurring_amount?: number | null
          recurring_day?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      criancas_cache: {
        Row: {
          cmei_atual_id: string | null
          cmei_atual_nome: string | null
          data_nascimento: string | null
          deleted_at: string | null
          id: string
          logradouro: string | null
          nome: string | null
          nome_responsavel: string | null
          numero: string | null
          responsavel_telefone: string | null
          sincronizado_em: string | null
          turma_atual_id: string | null
          turma_atual_nome: string | null
          updated_at: string | null
        }
        Insert: {
          cmei_atual_id?: string | null
          cmei_atual_nome?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          id: string
          logradouro?: string | null
          nome?: string | null
          nome_responsavel?: string | null
          numero?: string | null
          responsavel_telefone?: string | null
          sincronizado_em?: string | null
          turma_atual_id?: string | null
          turma_atual_nome?: string | null
          updated_at?: string | null
        }
        Update: {
          cmei_atual_id?: string | null
          cmei_atual_nome?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          id?: string
          logradouro?: string | null
          nome?: string | null
          nome_responsavel?: string | null
          numero?: string | null
          responsavel_telefone?: string | null
          sincronizado_em?: string | null
          turma_atual_id?: string | null
          turma_atual_nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      institution_settings: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          institution_name: string
          logo_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_name?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_name?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string
          settings: Json | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider: string
          settings?: Json | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string
          settings?: Json | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          permissions: Json | null
          registration_number: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          school_id: string | null
          specialty: string | null
          specialty_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          permissions?: Json | null
          registration_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          school_id?: string | null
          specialty?: string | null
          specialty_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          permissions?: Json | null
          registration_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          school_id?: string | null
          specialty?: string | null
          specialty_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_complaint_messages: {
        Row: {
          complaint_id: string
          created_at: string
          id: string
          message: string
          sender_id: string | null
        }
        Insert: {
          complaint_id: string
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
        }
        Update: {
          complaint_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_complaint_messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "school_complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_complaint_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_complaints: {
        Row: {
          behavior_classroom: string | null
          created_at: string
          diagnosis_tags: string[] | null
          document_url: string | null
          id: string
          impact_learning: string | null
          laudo_type: string | null
          primary_complaint: string
          protocol: string
          referral_decided_at: string | null
          referral_decided_by: string | null
          referral_notes: string | null
          referral_requested: boolean | null
          referral_status: string
          reporter_id: string | null
          school_id: string
          status: string
          student_id: string
          symptoms: string | null
          updated_at: string
        }
        Insert: {
          behavior_classroom?: string | null
          created_at?: string
          diagnosis_tags?: string[] | null
          document_url?: string | null
          id?: string
          impact_learning?: string | null
          laudo_type?: string | null
          primary_complaint: string
          protocol: string
          referral_decided_at?: string | null
          referral_decided_by?: string | null
          referral_notes?: string | null
          referral_requested?: boolean | null
          referral_status?: string
          reporter_id?: string | null
          school_id: string
          status?: string
          student_id: string
          symptoms?: string | null
          updated_at?: string
        }
        Update: {
          behavior_classroom?: string | null
          created_at?: string
          diagnosis_tags?: string[] | null
          document_url?: string | null
          id?: string
          impact_learning?: string | null
          laudo_type?: string | null
          primary_complaint?: string
          protocol?: string
          referral_decided_at?: string | null
          referral_decided_by?: string | null
          referral_notes?: string | null
          referral_requested?: boolean | null
          referral_status?: string
          reporter_id?: string | null
          school_id?: string
          status?: string
          student_id?: string
          symptoms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_complaints_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_complaints_referral_decided_by_fkey"
            columns: ["referral_decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_complaints_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_complaints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      specialties: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          birth_date: string | null
          class_name: string | null
          created_at: string
          full_name: string
          guardian_name: string | null
          id: string
          observations: string | null
          reason: string | null
          school_id: string | null
          status: Database["public"]["Enums"]["student_status"] | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          class_name?: string | null
          created_at?: string
          full_name: string
          guardian_name?: string | null
          id?: string
          observations?: string | null
          reason?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          class_name?: string | null
          created_at?: string
          full_name?: string
          guardian_name?: string | null
          id?: string
          observations?: string | null
          reason?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_controle: {
        Row: {
          entidade: string
          ultima_sincronizacao: string | null
        }
        Insert: {
          entidade: string
          ultima_sincronizacao?: string | null
        }
        Update: {
          entidade?: string
          ultima_sincronizacao?: string | null
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string | null
          created_by: string | null
          creditor_id: string | null
          date: string
          description: string | null
          id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          creditor_id?: string | null
          date?: string
          description?: string | null
          id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          creditor_id?: string | null
          date?: string
          description?: string | null
          id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          success: boolean | null
          webhook_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          ativo: boolean
          body_template: Json | null
          created_at: string
          descricao: string | null
          evento: string
          headers: Json | null
          id: string
          metodo: string
          nome: string
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          body_template?: Json | null
          created_at?: string
          descricao?: string | null
          evento: string
          headers?: Json | null
          id?: string
          metodo?: string
          nome: string
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          body_template?: Json | null
          created_at?: string
          descricao?: string | null
          evento?: string
          headers?: Json | null
          id?: string
          metodo?: string
          nome?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhooks_exec_logs: {
        Row: {
          evento: string
          executado_em: string
          id: string
          payload_enviado: Json
          resposta: string | null
          status_http: number | null
          webhook_id: string
        }
        Insert: {
          evento: string
          executado_em?: string
          id?: string
          payload_enviado: Json
          resposta?: string | null
          status_http?: number | null
          webhook_id: string
        }
        Update: {
          evento?: string
          executado_em?: string
          id?: string
          payload_enviado?: Json
          resposta?: string | null
          status_http?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_exec_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      classes_unified: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string | null
          name: string | null
          school_id: string | null
          school_name: string | null
          source: string | null
        }
        Relationships: []
      }
      schools_unified: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          id: string | null
          name: string | null
          source: string | null
        }
        Relationships: []
      }
      students_unified: {
        Row: {
          cmei_atual_nome: string | null
          data_nascimento: string | null
          id: string | null
          nome: string | null
          nome_responsavel: string | null
          responsavel_telefone: string | null
          source: string | null
          turma_atual_nome: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: "scheduled" | "completed" | "missed" | "cancelled"
      student_status: "active" | "waiting" | "finished"
      user_role: "admin" | "professional" | "school_coord"
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
      appointment_status: ["scheduled", "completed", "missed", "cancelled"],
      student_status: ["active", "waiting", "finished"],
      user_role: ["admin", "professional", "school_coord"],
    },
  },
} as const
