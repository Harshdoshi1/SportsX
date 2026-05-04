# How to Start the Servers

## ⚠️ Important: Run from ROOT directory, not backend!

The project uses a monorepo structure where both frontend and backend are managed from the root `package.json`.

## 🚀 Quick Start

### Option 1: Start Both Servers (Recommended)
```bash
# From root directory (C:\Users\harsh.doshi\Videos\SportsX)
npm run dev
```
This starts:
- Frontend (Vite) on http://localhost:5173
- Backend (Express) on http://localhost:3000

### Option 2: Start Backend Only
```bash
# From root directory
npm run dev:server
```

### Option 3: Start Frontend Only
```bash
# From root directory
npm run dev:client
```

## 📝 Available Scripts

From root directory:
- `npm run dev` - Start both frontend and backend
- `npm run dev:client` - Start frontend only (Vite)
- `npm run dev:server` - Start backend only (Express with --watch)
- `npm run server` - Start backend without watch mode
- `npm run build` - Build frontend for production

## ✅ Correct Workflow

```bash
# 1. Navigate to root directory
cd C:\Users\harsh.doshi\Videos\SportsX

# 2. Start both servers
npm run dev

# 3. Wait for both to start
# You should see:
# - "VITE v6.x.x ready at http://localhost:5173"
# - "Server running on port 3000"

# 4. Open browser
# http://localhost:5173
```

## ❌ Common Mistakes

### Mistake 1: Running from backend directory
```bash
cd backend
npm start  # ❌ WRONG - no start script in backend
```

### Mistake 2: Looking for backend/package.json
```bash
# ❌ WRONG - backend doesn't have its own package.json
# All dependencies are in root package.json
```

## 🔧 Troubleshooting

### "Missing script: start"
**Problem**: You're in the backend directory
**Solution**: 
```bash
cd ..  # Go back to root
npm run dev
```

### Port Already in Use
**Problem**: Port 3000 or 5173 already in use
**Solution**:
```bash
# Windows - Kill process on port
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or just restart your computer
```

### Backend Not Starting
**Problem**: Missing dependencies
**Solution**:
```bash
# From root directory
npm install
npm run dev
```

## 📊 What Happens When You Run `npm run dev`

1. **Concurrently** starts two processes:
   - `npm run dev:client` → Vite dev server (frontend)
   - `npm run dev:server` → Node with --watch (backend)

2. **Frontend** (Vite):
   - Runs on http://localhost:5173
   - Hot reload enabled
   - Proxies API calls to backend

3. **Backend** (Express):
   - Runs on http://localhost:3000
   - Auto-restarts on file changes (--watch flag)
   - Serves API endpoints

## 🎯 Complete Setup Flow

```bash
# 1. Open terminal in root directory
cd C:\Users\harsh.doshi\Videos\SportsX

# 2. Install dependencies (if not done)
npm install

# 3. Create Supabase table (one-time setup)
# - Open Supabase Dashboard
# - Go to SQL Editor
# - Run SQL from supabase_live_matches_table.sql

# 4. Check .env file exists with Supabase credentials
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# 5. Start servers
npm run dev

# 6. Open browser
# http://localhost:5173

# 7. Login as admin
# Email: admin@gmail.com
# Password: Harshdoshi1$

# 8. Add live match and test!
```

## 📁 Project Structure

```
SportsX/
├── package.json          ← Main package.json (run scripts from here)
├── backend/
│   ├── server.js         ← Backend entry point
│   ├── app.js
│   ├── routes/
│   ├── controllers/
│   └── services/
├── src/                  ← Frontend source
│   └── app/
└── public/
```

## 🔄 Development Workflow

1. **Make changes** to backend or frontend files
2. **Backend**: Auto-restarts (thanks to --watch)
3. **Frontend**: Hot reloads automatically
4. **No need to restart** manually!

## 🎉 Success Indicators

When everything is working, you should see:

```
Terminal Output:
[0] 
[0]   VITE v6.3.5  ready in 1234 ms
[0] 
[0]   ➜  Local:   http://localhost:5173/
[0]   ➜  Network: use --host to expose
[1] 
[1] Server running on port 3000
[1] Environment: development
```

Browser:
- ✅ http://localhost:5173 loads
- ✅ Can login as admin
- ✅ See "Add Live Match" button
- ✅ Can add and view matches

## 💡 Pro Tips

1. **Keep terminal open**: Don't close it while developing
2. **Check both logs**: Watch for errors in terminal
3. **Clear cache**: If issues, try Ctrl+Shift+R in browser
4. **Restart if needed**: Ctrl+C to stop, then `npm run dev` again

---

**Remember**: Always run `npm run dev` from the ROOT directory, not from backend!
