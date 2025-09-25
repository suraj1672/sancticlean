-- Quick Setup SQL for SanctiClean NGO Management
-- Copy and paste these commands in your Supabase SQL Editor

-- 1. Create the ngos table
CREATE TABLE public.ngos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for anonymous access
CREATE POLICY "Allow all operations on ngos" ON public.ngos
    FOR ALL USING (true);

-- 4. Insert initial data
INSERT INTO public.ngos (id, name, description, phone, email) VALUES
('greenpuri', 'Green Puri Initiative', 'Environmental conservation and waste management', '+91 9876543210', 'info@greenpuri.org'),
('swachhodisha', 'Swachh Odisha Foundation', 'Clean India mission implementation', '+91 9876543211', 'contact@swachhodisha.org'),
('templecare', 'Temple Care Society', 'Temple maintenance and cleanliness', '+91 9876543212', 'help@templecare.org'),
('cleannetwork', 'Community Clean Network', 'Community-driven cleanliness programs', '+91 9876543213', 'info@cleannetwork.org');
