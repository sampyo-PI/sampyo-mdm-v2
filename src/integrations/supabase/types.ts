/**
 * 자동생성 placeholder. 실 사용 시 supabase CLI로 재생성:
 *   bunx supabase gen types typescript --project-id xziehhunxvxxwtqkzobv > src/integrations/supabase/types.ts
 *
 * 기존 MDM types.ts 복사 금지 (drift 위험). 신규 앱에서 fresh generate.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
  };
}
