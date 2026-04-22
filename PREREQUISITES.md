# Prerequisites

Complete these setup steps before getting started.

---

## Required Software

### 1. Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version
3. Run the installer
4. Restart your terminal after installation

```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
```

### 2. Git

- **Mac**: Open Terminal and run `git --version`. If not installed, follow the prompts.
- **Windows**: Download from https://git-scm.com/download/windows

```bash
git --version     # Should show git version 2.x.x or higher
```

**First-time Git setup:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Visual Studio Code (Recommended)

Download from https://code.visualstudio.com

---

## Required Accounts

### 1. GitHub Account

For storing and sharing your code.

1. Go to https://github.com
2. Sign up for a free account

### 2. Vercel Account

For deploying your application.

1. Go to https://vercel.com
2. **Sign up with GitHub** for easier deployment

### 3. Supabase Account (Optional)

For authentication and database.

1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project
4. Go to Project Settings → API and copy your keys

---

## Checklist

```bash
node --version     # v20.x.x or higher
npm --version      # 10.x.x or higher
git --version      # 2.x.x or higher
```

- [ ] I can log in to GitHub.com
- [ ] I can log in to Vercel.com
- [ ] (Optional) I have a Supabase account

---

## Troubleshooting

### "command not found" errors
- Restart your terminal after installing software
- On Windows, you may need to restart your computer

### Permission errors on Mac
- Prefix commands with `sudo` (e.g., `sudo npm install -g ...`)

### Git authentication issues
- Use a Personal Access Token instead of password
- GitHub → Settings → Developer settings → Personal access tokens

---

## Quick Reference

| Software | Download Link | Verify Command |
|----------|--------------|----------------|
| Node.js | https://nodejs.org | `node --version` |
| Git | https://git-scm.com | `git --version` |
| VS Code | https://code.visualstudio.com | Open the app |

| Account | Sign Up Link |
|---------|-------------|
| GitHub | https://github.com |
| Vercel | https://vercel.com |
| Supabase (Optional) | https://supabase.com |
