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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anotacoes_aluno: {
        Row: {
          created_at: string | null
          crianca_id: string
          id: string
          texto: string
          updated_at: string | null
          user_id: string
          user_nome: string | null
        }
        Insert: {
          created_at?: string | null
          crianca_id: string
          id?: string
          texto: string
          updated_at?: string | null
          user_id: string
          user_nome?: string | null
        }
        Update: {
          created_at?: string | null
          crianca_id?: string
          id?: string
          texto?: string
          updated_at?: string | null
          user_id?: string
          user_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_aluno_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "cache_criancas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          detalhes: string | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          detalhes?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          detalhes?: string | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cache_criancas: {
        Row: {
          ativo: boolean | null
          cmei_id: string | null
          cmei_nome: string | null
          created_at: string | null
          dados_json: Json | null
          data_nascimento: string | null
          external_id: string
          id: string
          nome: string
          responsavel: string | null
          sincronizado_em: string | null
          telefone: string | null
          turma_id: string | null
          turma_nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          dados_json?: Json | null
          data_nascimento?: string | null
          external_id: string
          id?: string
          nome: string
          responsavel?: string | null
          sincronizado_em?: string | null
          telefone?: string | null
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          dados_json?: Json | null
          data_nascimento?: string | null
          external_id?: string
          id?: string
          nome?: string
          responsavel?: string | null
          sincronizado_em?: string | null
          telefone?: string | null
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cache_usuarios: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          cmei_id: string | null
          cmei_nome: string | null
          created_at: string | null
          dados_json: Json | null
          email: string | null
          external_id: string
          id: string
          nome: string
          sincronizado_em: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          dados_json?: Json | null
          email?: string | null
          external_id: string
          id?: string
          nome: string
          sincronizado_em?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          dados_json?: Json | null
          email?: string | null
          external_id?: string
          id?: string
          nome?: string
          sincronizado_em?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      local_cmeis: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      local_criancas: {
        Row: {
          ativo: boolean | null
          cmei_id: string | null
          cmei_nome: string | null
          created_at: string | null
          created_by: string | null
          data_nascimento: string | null
          id: string
          nome: string
          responsavel: string | null
          telefone: string | null
          turma_id: string | null
          turma_nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          telefone?: string | null
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      local_turmas: {
        Row: {
          ativo: boolean | null
          cmei_id: string | null
          cmei_nome: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cmei_id?: string | null
          cmei_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logs_sincronizacao: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          executado_por: string | null
          id: string
          registros_erro: number | null
          registros_processados: number | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          executado_por?: string | null
          id?: string
          registros_erro?: number | null
          registros_processados?: number | null
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          executado_por?: string | null
          id?: string
          registros_erro?: number | null
          registros_processados?: number | null
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      metas_sondagem: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nivel_codigo: string
          obrigatoria: boolean
          periodo_codigo: string
          tipo: string
          turma_tipo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nivel_codigo: string
          obrigatoria?: boolean
          periodo_codigo: string
          tipo?: string
          turma_tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nivel_codigo?: string
          obrigatoria?: boolean
          periodo_codigo?: string
          tipo?: string
          turma_tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      modelos_sondagem: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      niveis_aprendizagem: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          ordem: number
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          ordem?: number
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          ordem?: number
          tipo?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          cmei_id: string | null
          created_at: string | null
          id: string
          lida: boolean
          mensagem: string | null
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          cmei_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          cmei_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      perguntas_modelo: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          modelo_id: string
          ordem: number
          texto: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modelo_id: string
          ordem?: number
          texto: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modelo_id?: string
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_modelo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_sondagem"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cmei_id: string | null
          created_at: string | null
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cmei_id?: string | null
          created_at?: string | null
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cmei_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      respostas_sondagem: {
        Row: {
          created_at: string | null
          id: string
          nivel_id: string
          sondagem_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nivel_id: string
          sondagem_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nivel_id?: string
          sondagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_sondagem_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis_aprendizagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_sondagem_sondagem_id_fkey"
            columns: ["sondagem_id"]
            isOneToOne: false
            referencedRelation: "sondagens"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_config: {
        Row: {
          enviar_senha_ao_cadastrar: boolean
          from_email: string
          from_name: string
          host: string
          id: string
          password: string
          port: number
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          enviar_senha_ao_cadastrar?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Update: {
          enviar_senha_ao_cadastrar?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      solicitacoes_sondagem: {
        Row: {
          arquivo_url: string | null
          cmei_id: string
          cmei_nome: string | null
          created_at: string | null
          frases: string | null
          id: string
          mes: string
          palavras: string | null
          solicitante_id: string
          status: string
          tipo: string
          turma_id: string | null
          turma_nome: string | null
          updated_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          cmei_id: string
          cmei_nome?: string | null
          created_at?: string | null
          frases?: string | null
          id?: string
          mes: string
          palavras?: string | null
          solicitante_id: string
          status?: string
          tipo?: string
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          cmei_id?: string
          cmei_nome?: string | null
          created_at?: string | null
          frases?: string | null
          id?: string
          mes?: string
          palavras?: string | null
          solicitante_id?: string
          status?: string
          tipo?: string
          turma_id?: string | null
          turma_nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sondagem_niveis: {
        Row: {
          id: string
          modelo_id: string
          nivel_id: string
        }
        Insert: {
          id?: string
          modelo_id: string
          nivel_id: string
        }
        Update: {
          id?: string
          modelo_id?: string
          nivel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sondagem_niveis_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_sondagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sondagem_niveis_nivel_id_fkey"
            columns: ["nivel_id"]
            isOneToOne: false
            referencedRelation: "niveis_aprendizagem"
            referencedColumns: ["id"]
          },
        ]
      }
      sondagens: {
        Row: {
          aplicador_id: string
          created_at: string | null
          crianca_id: string
          id: string
          modelo_id: string
          observacoes: string | null
          periodo: string
          status: string
          updated_at: string | null
        }
        Insert: {
          aplicador_id: string
          created_at?: string | null
          crianca_id: string
          id?: string
          modelo_id: string
          observacoes?: string | null
          periodo: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          aplicador_id?: string
          created_at?: string | null
          crianca_id?: string
          id?: string
          modelo_id?: string
          observacoes?: string | null
          periodo?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sondagens_crianca_id_fkey"
            columns: ["crianca_id"]
            isOneToOne: false
            referencedRelation: "cache_criancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sondagens_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_sondagem"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_controle: {
        Row: {
          entidade: string
          ultima_sincronizacao: string
          updated_at: string
        }
        Insert: {
          entidade: string
          ultima_sincronizacao?: string
          updated_at?: string
        }
        Update: {
          entidade?: string
          ultima_sincronizacao?: string
          updated_at?: string
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
      view_cmeis_unificado: {
        Row: {
          fonte: string | null
          id: string | null
          nome: string | null
        }
        Relationships: []
      }
      view_criancas_unificado: {
        Row: {
          ativo: boolean | null
          cmei_id: string | null
          cmei_nome: string | null
          data_nascimento: string | null
          fonte: string | null
          id: string | null
          nome: string | null
          responsavel: string | null
          telefone: string | null
          turma_id: string | null
          turma_nome: string | null
        }
        Relationships: []
      }
      view_turmas_unificado: {
        Row: {
          cmei_id: string | null
          cmei_nome: string | null
          fonte: string | null
          id: string | null
          nome: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_cmei_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_cmei_by_email: {
        Args: { _cmei_id: string; _email: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "responsavel"
        | "equipe_pedagogica"
        | "coordenador"
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
      app_role: [
        "admin",
        "gestor",
        "responsavel",
        "equipe_pedagogica",
        "coordenador",
      ],
    },
  },
} as const
