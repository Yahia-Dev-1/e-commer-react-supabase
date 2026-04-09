-- FORCE FIX: Complete orders table recreation with cache refresh
DROP TABLE IF EXISTS orders CASCADE;

-- Create with all columns
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderNumber TEXT NOT NULL UNIQUE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    userId TEXT,
    userEmail TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total FLOAT DEFAULT 0,
    shipping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Force cache refresh multiple times
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(3);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(3);
NOTIFY pgrst, 'reload schema';

-- Verify table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;
