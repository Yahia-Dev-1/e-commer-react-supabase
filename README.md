# Yahia Store - E-commerce React App

[![Vercel Deploy](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-green?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)

A modern e-commerce application with **real-time product synchronization** across all devices using Supabase.

🌐 **Live Demo**: [yahia-store.vercel.app](https://yahia-store.vercel.app) *(after deployment)*

---

## ✨ Features

- ⚡ **Real-time Sync** - Products sync instantly across all devices
- 🛍️ **Product Management** - Add, edit, delete with admin protection
- 🛒 **Shopping Cart** - Full cart with quantity management
- 👤 **User Auth** - Login/Register with admin roles
- 📱 **Responsive** - Works on mobile, tablet, desktop
- 🌙 **Dark Mode** - Always-enabled modern UI
- 📦 **PWA Ready** - Install as mobile app

---

## 🚀 Deploy to Vercel (One Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yahia-dev-1/E-Commer-React)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Ready for Vercel"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repo
   - Click **Deploy**

3. **Add Environment Variables**
   
   In Vercel Dashboard → Project Settings → Environment Variables:
   
   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | `https://pmcqryrwpsacyehmedla.supabase.co` |
   | `REACT_APP_SUPABASE_KEY` | `sb_publishable_39dbjDLc4vkU6TXsfqRx2w_JghYcvuy` |

4. **Redeploy**
   - Vercel will auto-redeploy with new env vars

---

## 🛠️ Local Development

```bash
# Clone
git clone https://github.com/yahia-dev-1/E-Commer-React.git
cd E-Commer-React

# Install
npm install

# Start
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Admin Accounts

### Protected Admins (Cannot be deleted)

| Email | Password |
|-------|----------|
| `yahiapro400@gmail.com` | `yahia2024` |
| `yahiacool2009@gmail.com` | `yahia2009` |

### Regular Admin

| Email | Password |
|-------|----------|
| `admin-test@gmail.com` | `admin123` |

---

## 📊 Supabase Setup

### 1. Create Table

Go to [supabase.com](https://supabase.com) → Table Editor → New Table

**Table name**: `products`

| Column | Type | Default |
|--------|------|---------|
| `id` | `uuid` | `gen_random_uuid()` |
| `title` | `text` | - |
| `price` | `float8` | - |
| `quantity` | `int8` | - |
| `image` | `text` | - |
| `description` | `text` | - |
| `category` | `text` | - |
| `createdBy` | `text` | - |
| `isProtected` | `boolean` | `false` |
| `created_at` | `timestamptz` | `now()` |
| `updated_at` | `timestamptz` | - |
| `updated_by` | `text` | - |

**Disable RLS** for testing (Project Settings → Auth → Policies).

### 2. Verify Sync

**Method 1 - Dashboard:**
- Go to Supabase → Table Editor → products
- See all products added

**Method 2 - Console:**
Open browser DevTools (F12) → Console:
```
✅ Product "XXX" added! All devices will see it.
🔄 Supabase: Products updated! 5 items
```

**Method 3 - Cross-device:**
1. Add product from laptop
2. Open site on phone
3. Product appears instantly! 🎉

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── AddProducts.js    # Product CRUD
│   ├── cards.js          # Product cards
│   ├── cart.js           # Shopping cart
│   ├── nav.js            # Navigation
│   ├── Admin.js          # Admin panel
│   └── ...
├── utils/
│   ├── supabase.js       # Supabase client
│   └── database.js       # Local storage
├── styles/              # CSS files
├── App.js               # Main app
└── index.js             # Entry point
```

---

## 📝 Environment Variables

Create `.env.local` for local development:

```env
REACT_APP_SUPABASE_URL=https://pmcqryrwpsacyehmedla.supabase.co
REACT_APP_SUPABASE_KEY=sb_publishable_39dbjDLc4vkU6TXsfqRx2w_JghYcvuy
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Products not syncing | Check env vars in Vercel dashboard |
| Can't login | Use admin accounts above |
| Build fails | Delete `node_modules` & `npm install` |
| 404 on refresh | Add `vercel.json` (see below) |

---

## ⚡ Vercel Config

Create `vercel.json` for React Router support:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📄 License

MIT - Free to use and modify!

---

## 📞 Support

- 📧 Email: yahiapro400@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/yahia-dev-1/E-Commer-React/issues)

---

<div align="center">
  <p>Built with ❤️ by Yahia Dev</p>
  <p>🚀 Ready for Vercel Deployment 🚀</p>
</div>
