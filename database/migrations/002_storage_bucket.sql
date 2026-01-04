-- ============================================
-- Create Storage Bucket for Screenshots
-- ============================================
-- Note: This needs to be run with service_role permissions
-- Or configure in Supabase Dashboard > Storage

-- Create the screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'screenshots',
    'screenshots',
    true,  -- Public bucket for easy access
    5242880,  -- 5MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the screenshots bucket
-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access for screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

-- Allow authenticated users to upload
CREATE POLICY "Service role can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots');

-- Allow authenticated users to update
CREATE POLICY "Service role can update screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'screenshots');

-- Allow authenticated users to delete
CREATE POLICY "Service role can delete screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'screenshots');

