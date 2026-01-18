# 🚀 Complete Setup & Deployment Guide

## Starting from Zero - Everything You Need to Do

---

## Prerequisites (Install These First)

### 1. Install Node.js
- Go to: https://nodejs.org/
- Download the **LTS version** (recommended)
- Run the installer
- Verify installation by opening Terminal/Command Prompt:
  ```bash
  node --version
  npm --version
  ```

### 2. Install Git
- Go to: https://git-scm.com/downloads
- Download and install for your OS
- Verify:
  ```bash
  git --version
  ```

---

## Step 1: Create Cloudflare Account (5 minutes)

1. Go to: https://dash.cloudflare.com/sign-up
2. Enter your email and create a password
3. Verify your email
4. You'll land on the Cloudflare dashboard

**No credit card required** - Workers free tier is plenty for this project.

---

## Step 2: Download Project Files

Download the `feedback-copilot-v4` folder from this conversation. It contains:
```
feedback-copilot-v4/
├── src/
│   └── index.js        # Main application code
├── wrangler.toml       # Cloudflare configuration
├── package.json        # Dependencies
├── README.md           # Documentation
├── preview.html        # UI preview (not needed for deploy)
└── .gitignore          # Git ignore rules
```

Save it somewhere like `~/Projects/feedback-copilot-v4` or `C:\Projects\feedback-copilot-v4`

---

## Step 3: Open Terminal & Navigate to Project

**Mac/Linux:**
```bash
cd ~/Projects/feedback-copilot-v4
```

**Windows (Command Prompt or PowerShell):**
```bash
cd C:\Projects\feedback-copilot-v4
```

---

## Step 4: Install Dependencies

```bash
npm install
```

This installs Wrangler (Cloudflare's CLI tool).

---

## Step 5: Login to Cloudflare

```bash
npx wrangler login
```

This opens your browser. Click "Allow" to authorize Wrangler.

You should see: `Successfully logged in.`

---

## Step 6: Create D1 Database

```bash
npx wrangler d1 create feedback-db
```

**IMPORTANT:** This outputs something like:
```
✅ Successfully created DB 'feedback-db' in region WNAM

[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "abc123-your-unique-id-here"
```

**Copy the `database_id` value!** You need it for the next step.

---

## Step 7: Update wrangler.toml

Open `wrangler.toml` in any text editor and replace `YOUR_DATABASE_ID_HERE` with your actual database ID:

**Before:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

**After:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "abc123-your-unique-id-here"
```

Save the file.

---

## Step 8: Deploy to Cloudflare

```bash
npx wrangler deploy
```

**Success output:**
```
Deployed feedback-copilot triggers:
  https://feedback-copilot.YOUR-SUBDOMAIN.workers.dev
```

🎉 **Copy this URL - this is your live prototype!**

---

## Step 9: Initialize the Database

1. Open your deployed URL in a browser
2. You'll see a notice: "Database needs setup"
3. Click **"Initialize"**
4. The page will populate with mock data
5. Try asking a question like "What are users frustrated about?"

---

## Step 10: Take Architecture Screenshot

1. Go to: https://dash.cloudflare.com/
2. Click **"Workers & Pages"** in the left sidebar
3. Click on **"feedback-copilot"**
4. Click the **"Settings"** tab
5. Scroll down to **"Bindings"** section
6. **Take a screenshot** - you'll need this for submission!

It should show:
- D1 Database binding (DB → feedback-db)
- Workers AI binding (AI)

---

## Step 11: Push to GitHub

### Create a GitHub account (if you don't have one)
Go to: https://github.com/signup

### Create a new repository
1. Go to: https://github.com/new
2. Repository name: `feedback-copilot`
3. Keep it **Public**
4. **Don't** initialize with README (we have one)
5. Click **"Create repository"**

### Push your code
In your terminal (still in the project folder):

```bash
git init
git add .
git commit -m "Feedback Copilot - AI-First Feedback Analysis Tool"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/feedback-copilot.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## ✅ You Now Have:

1. **Live Demo URL:** `https://feedback-copilot.YOUR-SUBDOMAIN.workers.dev`
2. **GitHub Repo:** `https://github.com/YOUR_USERNAME/feedback-copilot`
3. **Architecture Screenshot:** From the Workers dashboard bindings page

---

## 📝 Part 2: Friction Log

As you go through these steps, **write down every issue you encounter**:

- Confusing documentation?
- Unclear error messages?
- UI that was hard to find?
- Something that took longer than expected?

Format each one as:
```
Title: [Short name]
Problem: [What happened]
Suggestion: [How to fix it]
```

You need 3-5 of these for the submission.

---

## 📄 Final Submission

Create a PDF containing:

1. **Project Links**
   - Live demo URL
   - GitHub repository URL

2. **Architecture Overview**
   - Screenshot of Workers Bindings page
   - Brief explanation:
     > "Built using Cloudflare Workers (hosts API + frontend), D1 (SQLite database for feedback storage), and Workers AI (Llama 3.1 8B for natural language analysis). Single-file architecture for rapid prototyping."

3. **Friction Log**
   - Your 3-5 insights from Part 2

4. **Vibe-coding Context** (Optional)
   - "Built using Claude AI with iterative prompting for UI design and feature development"

Submit via the link in your original assignment email before **January 25, 2026 at 11:59 PM PT**.

---

## 🆘 Troubleshooting

**"wrangler: command not found"**
→ Use `npx wrangler` instead of just `wrangler`

**"Database not found" error on deploy**
→ Make sure you updated wrangler.toml with the correct database_id

**"Unauthorized" error**
→ Run `npx wrangler login` again

**Site shows error after deploy**
→ Check the Workers logs: `npx wrangler tail`

---

Good luck! 🚀
