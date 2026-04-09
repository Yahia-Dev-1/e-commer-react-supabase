-- 🚨 SQL شامل: مسح كل حاجة وعملها من جديد

-- 1️⃣ مسح كل الـ Tables
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 2️⃣ عمل PRODUCTS TABLE
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    price FLOAT DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    image TEXT,
    description TEXT,
    category TEXT DEFAULT 'General',
    createdBy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ عمل USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    isAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ عمل ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderNumber TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    userId TEXT,
    userEmail TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total FLOAT DEFAULT 0,
    shipping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON orders FOR ALL USING (true) WITH CHECK (true);

-- 6️⃣ Refresh Cache
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(3);
NOTIFY pgrst, 'reload schema';

-- 7️⃣ Verify
SELECT 'PRODUCTS:' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'USERS:', COUNT(*) FROM users
UNION ALL
SELECT 'ORDERS:', COUNT(*) FROM orders;
