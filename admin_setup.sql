-- إضافة Admin Account الوحيد
INSERT INTO users (email, password, name, isAdmin, created_at)
VALUES 
  ('yahiapro400@gmail.com', 'ylyr5767ykm34562', 'Yahia Pro', true, now())
ON CONFLICT (email) DO NOTHING;
