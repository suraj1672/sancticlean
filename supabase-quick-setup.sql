-- Quick Setup SQL for SanctiClean NGO and Temple Management
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

-- 2. Create the temples table
CREATE TABLE public.temples (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create the footer_contact table
CREATE TABLE public.footer_contact (
    id TEXT PRIMARY KEY DEFAULT 'main',
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_contact ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for anonymous access
CREATE POLICY "Allow all operations on ngos" ON public.ngos
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on temples" ON public.temples
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on footer_contact" ON public.footer_contact
    FOR ALL USING (true);

-- 6. Insert initial NGO data
INSERT INTO public.ngos (id, name, description, phone, email) VALUES
('greenpuri', 'Green Puri Initiative', 'Environmental conservation and waste management', '+91 9876543210', 'info@greenpuri.org'),
('swachhodisha', 'Swachh Odisha Foundation', 'Clean India mission implementation', '+91 9876543211', 'contact@swachhodisha.org'),
('templecare', 'Temple Care Society', 'Temple maintenance and cleanliness', '+91 9876543212', 'help@templecare.org'),
('cleannetwork', 'Community Clean Network', 'Community-driven cleanliness programs', '+91 9876543213', 'info@cleannetwork.org');

-- 7. Insert initial temple data
INSERT INTO public.temples (id, name, location, device_id) VALUES
('jagannath', 'Jagannath Temple', 'Main Temple Complex, Puri', 'TEMPLE_01'),
('gundicha', 'Gundicha Temple', 'Gundicha Ghar, Puri', 'TEMPLE_02'),
('lokanath', 'Lokanath Temple', 'Lokanath Road, Puri', 'TEMPLE_03'),
('mausimaa', 'Mausi Maa Temple', 'Grand Road, Puri', 'TEMPLE_04');

-- 8. Insert initial footer contact data
INSERT INTO public.footer_contact (id, email, phone) VALUES
('main', 'support@templedashboard.com', '+91 674-XXXX-XXXX');
