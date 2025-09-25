-- Supabase SQL Schema for SanctiClean NGO Management
-- Run these commands in your Supabase SQL Editor

-- Create the ngos table
CREATE TABLE IF NOT EXISTS public.ngos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the id column for faster lookups
CREATE INDEX IF NOT EXISTS idx_ngos_id ON public.ngos(id);

-- Create an index on email for faster searches
CREATE INDEX IF NOT EXISTS idx_ngos_email ON public.ngos(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous users to read NGO data
CREATE POLICY "Allow anonymous read access to ngos" ON public.ngos
    FOR SELECT USING (true);

-- Create a policy that allows anonymous users to insert NGO data
CREATE POLICY "Allow anonymous insert access to ngos" ON public.ngos
    FOR INSERT WITH CHECK (true);

-- Create a policy that allows anonymous users to update NGO data
CREATE POLICY "Allow anonymous update access to ngos" ON public.ngos
    FOR UPDATE USING (true);

-- Create a policy that allows anonymous users to delete NGO data
CREATE POLICY "Allow anonymous delete access to ngos" ON public.ngos
    FOR DELETE USING (true);

-- Insert initial NGO data
INSERT INTO public.ngos (id, name, description, phone, email) VALUES
('greenpuri', 'Green Puri Initiative', 'Environmental conservation and waste management', '+91 9876543210', 'info@greenpuri.org'),
('swachhodisha', 'Swachh Odisha Foundation', 'Clean India mission implementation', '+91 9876543211', 'contact@swachhodisha.org'),
('templecare', 'Temple Care Society', 'Temple maintenance and cleanliness', '+91 9876543212', 'help@templecare.org'),
('cleannetwork', 'Community Clean Network', 'Community-driven cleanliness programs', '+91 9876543213', 'info@cleannetwork.org')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_ngos_updated_at ON public.ngos;
CREATE TRIGGER update_ngos_updated_at
    BEFORE UPDATE ON public.ngos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.ngos TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
