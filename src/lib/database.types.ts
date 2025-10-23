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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      place_hours: {
        Row: {
          close: string
          id: string
          open: string
          place_id: string
          weekday: number
        }
        Insert: {
          close: string
          id?: string
          open: string
          place_id: string
          weekday: number
        }
        Update: {
          close?: string
          id?: string
          open?: string
          place_id?: string
          weekday?: number
        }
        Relationships: [
      {
        foreignKeyName: "place_hours_place_id_fkey"
        columns: ["place_id"]
        isOneToOne: false
        referencedRelation: "places"
        referencedColumns: ["id"]
      },
    ]
  }
      place_banners: {
        Row: {
          id: string
          place_id: string
          storage_path: string
          public_url: string | null
          metadata: Json | null
          is_active: boolean | null
          moderation_status: string | null
          inserted_by: string | null
          inserted_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          place_id: string
          storage_path: string
          public_url?: string | null
          metadata?: Json | null
          is_active?: boolean | null
          moderation_status?: string | null
          inserted_by?: string | null
          inserted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          place_id?: string
          storage_path?: string
          public_url?: string | null
          metadata?: Json | null
          is_active?: boolean | null
          moderation_status?: string | null
          inserted_by?: string | null
          inserted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_banners_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          banner_url: string | null
          category: string
          created_at: string | null
          id: string
          lat: string | null
          lat_backup: string | null
          lng: string | null
          lng_backup: string | null
          name: string
          logo_url: string | null
          phone: string | null
          price_tier: number | null
          price_icon: string | null
          rating_avg: number | null
          rating_count: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          category: string
          created_at?: string | null
          id?: string
          lat?: string | null
          lat_backup?: string | null
          lng?: string | null
          lng_backup?: string | null
          name: string
          logo_url?: string | null
          phone?: string | null
          price_tier?: number | null
          price_icon?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          category?: string
          created_at?: string | null
          id?: string
          lat?: string | null
          lat_backup?: string | null
          lng?: string | null
          lng_backup?: string | null
          name?: string
          logo_url?: string | null
          phone?: string | null
          price_tier?: number | null
          price_icon?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          website?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          photo_url: string
          place_id: string
          price_tier: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          photo_url: string
          place_id: string
          price_tier?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          photo_url?: string
          place_id?: string
          price_tier?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin?: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string | null
          id: string
          photo_urls: string[] | null
          place_id: string | null
          price_yen: number | null
          rating: number | null
          text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_urls?: string[] | null
          place_id?: string | null
          price_yen?: number | null
          rating?: number | null
          text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_urls?: string[] | null
          place_id?: string | null
          price_yen?: number | null
          rating?: number | null
          text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          list_type: Database["public"]["Enums"]["list_type"]
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          list_type: Database["public"]["Enums"]["list_type"]
          slug?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          list_type?: Database["public"]["Enums"]["list_type"]
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_list_entries: {
        Row: {
          added_at: string
          id: string
          list_id: string
          note: string | null
          place_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          note?: string | null
          place_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          note?: string | null
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_list_entries_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_list_entries_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_visits: {
        Row: {
          id: string
          note: string | null
          place_id: string
          rating: number | null
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          note?: string | null
          place_id: string
          rating?: number | null
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          note?: string | null
          place_id?: string
          rating?: number | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_visits_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      place_auras: {
        Row: {
          last_calculated_at: string
          place_id: string
          score: number
          tier: Database["public"]["Enums"]["aura_tier"]
          user_id: string
        }
        Insert: {
          last_calculated_at?: string
          place_id: string
          score?: number
          tier?: Database["public"]["Enums"]["aura_tier"]
          user_id: string
        }
        Update: {
          last_calculated_at?: string
          place_id?: string
          score?: number
          tier?: Database["public"]["Enums"]["aura_tier"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_auras_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_auras_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      list_share_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          list_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          list_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          list_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_share_tokens_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: true
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_relationships: {
        Row: {
          addressee_id: string
          created_at: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_relationships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_post_date: string | null
          longest_streak: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak: number
          last_post_date?: string | null
          longest_streak: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number
          last_post_date?: string | null
          longest_streak?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_default_lists: {
        Args: {
          p_user: string
        }
        Returns: {
          wishlist_id: string | null
          favorites_id: string | null
        }[]
      }
      log_visit_and_update: {
        Args: {
          p_user: string
          p_place: string
          p_note?: string | null
          p_rating?: number | null
        }
        Returns: void
      }
      recompute_user_place_aura: {
        Args: {
          p_user: string
          p_place: string
        }
        Returns: void
      }
      toggle_list_membership: {
        Args: {
          p_user: string
          p_place: string
          p_type: Database["public"]["Enums"]["list_type"]
        }
        Returns: boolean
      }
      upsert_list_share_token: {
        Args: {
          p_list: string
        }
        Returns: string
      }
    }
    Enums: {
      aura_tier: "none" | "bronze" | "silver" | "gold" | "mythic"
      list_type: "wishlist" | "favorites"
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
    Enums: {},
  },
} as const
