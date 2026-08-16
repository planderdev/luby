export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advertisers: {
        Row: {
          business_address: string | null
          business_number: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          profile_id: string
          representative_name: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_number?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          profile_id: string
          representative_name?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_number?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          profile_id?: string
          representative_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string
          message: string | null
          selected_at: string | null
          selected_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id: string
          message?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          message?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "applications_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_channels: {
        Row: {
          campaign_id: string
          channel_type_id: string
        }
        Insert: {
          campaign_id: string
          channel_type_id: string
        }
        Update: {
          campaign_id?: string
          channel_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_channels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_channels_channel_type_id_fkey"
            columns: ["channel_type_id"]
            isOneToOne: false
            referencedRelation: "channel_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_keywords: {
        Row: {
          campaign_id: string
          id: string
          keyword: string
        }
        Insert: {
          campaign_id: string
          id?: string
          keyword: string
        }
        Update: {
          campaign_id?: string
          id?: string
          keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_keywords_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_missions: {
        Row: {
          campaign_id: string
          channel_type_id: string
          description: string
          id: string
          required: boolean
        }
        Insert: {
          campaign_id: string
          channel_type_id: string
          description: string
          id?: string
          required?: boolean
        }
        Update: {
          campaign_id?: string
          channel_type_id?: string
          description?: string
          id?: string
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "campaign_missions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_missions_channel_type_id_fkey"
            columns: ["channel_type_id"]
            isOneToOne: false
            referencedRelation: "channel_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_offerings: {
        Row: {
          campaign_id: string
          description: string | null
          estimated_value: number | null
          id: string
          title: string
        }
        Insert: {
          campaign_id: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          title: string
        }
        Update: {
          campaign_id?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_offerings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedules: {
        Row: {
          campaign_id: string
          day_of_week: number | null
          end_time: string | null
          id: string
          start_time: string | null
        }
        Insert: {
          campaign_id: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
        }
        Update: {
          campaign_id?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          advertiser_id: string
          always_open: boolean
          approved_at: string | null
          approved_by: string | null
          business_name: string
          category_id: string
          contact_phone: string | null
          created_at: string
          experience_end: string | null
          experience_start: string | null
          id: string
          industry_brief: string | null
          point_amount: number
          promotion_type_id: string
          recruit_count: number
          recruit_end: string
          recruit_start: string
          region_id: string
          same_day_reservation: boolean
          status: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          always_open?: boolean
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          category_id: string
          contact_phone?: string | null
          created_at?: string
          experience_end?: string | null
          experience_start?: string | null
          id?: string
          industry_brief?: string | null
          point_amount?: number
          promotion_type_id: string
          recruit_count?: number
          recruit_end: string
          recruit_start: string
          region_id: string
          same_day_reservation?: boolean
          status?: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          always_open?: boolean
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          category_id?: string
          contact_phone?: string | null
          created_at?: string
          experience_end?: string | null
          experience_start?: string | null
          id?: string
          industry_brief?: string | null
          point_amount?: number
          promotion_type_id?: string
          recruit_count?: number
          recruit_end?: string
          recruit_start?: string
          region_id?: string
          same_day_reservation?: boolean
          status?: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_promotion_type_id_fkey"
            columns: ["promotion_type_id"]
            isOneToOne: false
            referencedRelation: "promotion_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          emoji: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          emoji?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          emoji?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      channel_types: {
        Row: {
          active: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      influencer_channels: {
        Row: {
          channel_type_id: string
          created_at: string
          followers: number
          handle: string | null
          id: string
          influencer_id: string
          updated_at: string
          url: string
          verified: boolean
        }
        Insert: {
          channel_type_id: string
          created_at?: string
          followers?: number
          handle?: string | null
          id?: string
          influencer_id: string
          updated_at?: string
          url: string
          verified?: boolean
        }
        Update: {
          channel_type_id?: string
          created_at?: string
          followers?: number
          handle?: string | null
          id?: string
          influencer_id?: string
          updated_at?: string
          url?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "influencer_channels_channel_type_id_fkey"
            columns: ["channel_type_id"]
            isOneToOne: false
            referencedRelation: "channel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_channels_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      influencers: {
        Row: {
          bio: string | null
          birth_year: number | null
          created_at: string
          gender: string | null
          profile_id: string
          region_id: string | null
          total_points: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          gender?: string | null
          profile_id: string
          region_id?: string | null
          total_points?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          gender?: string | null
          profile_id?: string
          region_id?: string | null
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_invitations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string
          invited_by: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id: string
          invited_by: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          invited_by?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_invitations_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_categories: {
        Row: {
          category_id: string
          influencer_id: string
        }
        Insert: {
          category_id: string
          influencer_id: string
        }
        Update: {
          category_id?: string
          influencer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_categories_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
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
      payments: {
        Row: {
          id: string
          advertiser_id: string
          plan_id: string
          order_id: string
          order_name: string
          payment_key: string | null
          amount: number
          currency: string
          status: string
          method: string | null
          fail_reason: string | null
          approved_at: string | null
          raw: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advertiser_id: string
          plan_id: string
          order_id: string
          order_name: string
          payment_key?: string | null
          amount: number
          currency?: string
          status?: string
          method?: string | null
          fail_reason?: string | null
          approved_at?: string | null
          raw?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          advertiser_id?: string
          plan_id?: string
          order_id?: string
          order_name?: string
          payment_key?: string | null
          amount?: number
          currency?: string
          status?: string
          method?: string | null
          fail_reason?: string | null
          approved_at?: string | null
          raw?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          applicant_view_limit: number | null
          campaign_limit: number | null
          created_at: string
          features: Json
          id: string
          monthly_price: number
          name: string
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          applicant_view_limit?: number | null
          campaign_limit?: number | null
          created_at?: string
          features?: Json
          id?: string
          monthly_price?: number
          name: string
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          applicant_view_limit?: number | null
          campaign_limit?: number | null
          created_at?: string
          features?: Json
          id?: string
          monthly_price?: number
          name?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      point_withdrawals: {
        Row: {
          account_holder: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string
          id: string
          influencer_id: string
          processed_at: string | null
          processed_by: string | null
          reject_reason: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          influencer_id: string
          processed_at?: string | null
          processed_by?: string | null
          reject_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          influencer_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reject_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_withdrawals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_types: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          required_fields: string[]
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          required_fields?: string[]
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          required_fields?: string[]
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      regions: {
        Row: {
          active: boolean
          code: string
          currency: string
          flag: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          currency?: string
          flag: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          currency?: string
          flag?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_review: Json | null
          ai_reviewed_at: string | null
          application_id: string
          content_url: string
          created_at: string
          feedback: string | null
          id: string
          note: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          ai_review?: Json | null
          ai_reviewed_at?: string | null
          application_id: string
          content_url: string
          created_at?: string
          feedback?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          ai_review?: Json | null
          ai_reviewed_at?: string | null
          application_id?: string
          content_url?: string
          created_at?: string
          feedback?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          advertiser_id: string
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: true
            referencedRelation: "advertisers"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_submission: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      process_point_withdrawal: {
        Args: {
          p_approve: boolean
          p_reject_reason?: string
          p_withdrawal_id: string
        }
        Returns: undefined
      }
      request_point_withdrawal: {
        Args: {
          p_account_holder: string
          p_account_number: string
          p_amount: number
          p_bank_name: string
        }
        Returns: string
      }
      is_advertiser_owner: {
        Args: { advertiser_uuid: string }
        Returns: boolean
      }
      is_operator: { Args: never; Returns: boolean }
      get_creator_portfolio: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      respond_campaign_invitation: {
        Args: { p_invitation_id: string; p_accept: boolean }
        Returns: undefined
      }
      set_my_categories: {
        Args: { p_category_ids: string[] }
        Returns: undefined
      }
      search_creators: {
        Args: {
          p_query?: string | null
          p_category_id?: string | null
          p_region_id?: string | null
          p_channel_type_id?: string | null
          p_min_followers?: number | null
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          name: string
          avatar_url: string | null
          bio: string | null
          region_flag: string | null
          region_name: string | null
          total_followers: number
          completed_count: number
          channels: Json
          categories: Json
          total_count: number
        }[]
      }
      is_message_participant: {
        Args: { p_application_id: string }
        Returns: boolean
      }
      mark_thread_read: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      request_submission_revision: {
        Args: { p_feedback: string; p_submission_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status:
        | "pending"
        | "selected"
        | "rejected"
        | "cancelled"
        | "completed"
      business_type: "individual" | "corporation"
      campaign_status:
        | "draft"
        | "pending_approval"
        | "open"
        | "closed"
        | "completed"
        | "cancelled"
      plan_tier: "free" | "business" | "enterprise"
      subscription_status: "active" | "cancelled" | "expired"
      user_role: "advertiser" | "influencer" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
