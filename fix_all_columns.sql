-- =====================================================
-- 🚨 SQL شامل: يضيف كل الـ Columns الناقصة + Refresh Cache
-- =====================================================

-- 1️⃣ PRODUCTS TABLE - Add ALL missing columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS createdBy TEXT,
ADD COLUMN IF NOT EXISTS isProtected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2️⃣ USERS TABLE - Add ALL missing columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS isAdmin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS isProtected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3️⃣ ORDERS TABLE - Add ALL missing columns
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS orderNumber TEXT,
ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS userId TEXT,
ADD COLUMN IF NOT EXISTS userEmail TEXT,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4️⃣ Refresh Schema Cache (multiple times)
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);

-- 5️⃣ Verify all columns
SELECT '✅ PRODUCTS columns:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

SELECT '✅ USERS columns:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT '✅ ORDERS columns:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 6️⃣ Final cache refresh
NOTIFY pgrst, 'reload schema';
SELECT '✅ All columns added and cache refreshed!' as result;
