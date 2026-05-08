-- ================================
-- DRIP WARDROBE — Supabase Schema
-- 請到 Supabase Dashboard > SQL Editor 貼上執行
-- ================================

-- 1. users 表
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  body_photo_url text,
  style_tags text[] DEFAULT '{}',
  style_description text,
  preferred_occasions text[] DEFAULT '{}',
  push_notification_time time,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. wardrobe_items 表
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo_url text,
  category text CHECK (category IN ('上衣', '下著', '外套', '鞋子', '配件')),
  main_color text,
  brand text,
  fit text CHECK (fit IN ('oversized', 'slim', 'regular')),
  season text[] DEFAULT '{}',
  occasions text[] DEFAULT '{}',
  is_favorited boolean DEFAULT false,
  favorited_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. outfits 表
CREATE TABLE IF NOT EXISTS public.outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  item_ids uuid[] DEFAULT '{}',
  occasion text,
  vibe text CHECK (vibe IN ('輕鬆', '正式')),
  outfit_image_url text,
  try_on_image_url text,
  is_saved boolean DEFAULT false,
  ai_description text,
  created_at timestamp with time zone DEFAULT now()
);

-- ================================
-- Row Level Security（RLS）
-- 每個用戶只能看自己的資料
-- ================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- wardrobe_items policies
CREATE POLICY "Users can manage own wardrobe" ON public.wardrobe_items
  FOR ALL USING (auth.uid() = user_id);

-- outfits policies
CREATE POLICY "Users can manage own outfits" ON public.outfits
  FOR ALL USING (auth.uid() = user_id);

-- ================================
-- Storage Bucket
-- ================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload to wardrobe" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read wardrobe images" ON storage.objects
  FOR SELECT USING (bucket_id = 'wardrobe');
