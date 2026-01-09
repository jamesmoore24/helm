# Helm Setup Guide

A personal AI assistant powered by Claude Code with Gmail, Calendar, and browser integration.

---

## Setup Progress

**Instructions for Claude:** Check off each step as completed by changing `- [ ]` to `- [x]`. Guide the user through steps in order. If resuming, find the first unchecked box and continue from there.

---

## Prerequisites Checklist

- [ ] Claude Code installed locally (`npm install -g @anthropic-ai/claude-code`)
- [ ] Anthropic API key ready
- [ ] Credit card for cloud VM (~$5-20/month)
- [ ] Google account for Gmail/Calendar APIs
- [ ] Domain name (optional, for mobile access)

---

## Phase 1: Infrastructure Setup

### Create Virtual Machine

- [ ] **1.1** Create a cloud VM (Ubuntu 24.04 LTS, 2GB+ RAM)
  - Options: AWS EC2 (t3.medium), Google Cloud (e2-medium), DigitalOcean, Linode, Vultr
  - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

- [ ] **1.2** Note your server IP address: `__________________`

- [ ] **1.3** SSH into your VM
  ```bash
  ssh ubuntu@YOUR_SERVER_IP
  ```

### Install System Dependencies

- [ ] **1.4** Update system
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **1.5** Install Node.js 20+
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

- [ ] **1.6** Install essential tools
  ```bash
  sudo apt install -y git nginx certbot python3-certbot-nginx at
  ```

- [ ] **1.7** Enable the 'at' daemon
  ```bash
  sudo systemctl enable atd && sudo systemctl start atd
  ```

- [ ] **1.8** Install PM2 globally
  ```bash
  sudo npm install -g pm2
  ```

---

## Phase 2: Domain & HTTPS Setup

*Skip to Phase 3 if you only want local access.*

- [ ] **2.1** Point domain to server
  - Add A record: `helm.yourdomain.com` → `YOUR_SERVER_IP`
  - Note your domain: `__________________`

- [ ] **2.2** Create nginx config
  ```bash
  sudo nano /etc/nginx/sites-available/helm
  ```
  Paste this config (replace YOUR_DOMAIN):
  ```nginx
  server {
      listen 80;
      server_name YOUR_DOMAIN;
      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_cache_bypass $http_upgrade;
      }
  }
  ```

- [ ] **2.3** Enable nginx site
  ```bash
  sudo ln -s /etc/nginx/sites-available/helm /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  ```

- [ ] **2.4** Enable HTTPS
  ```bash
  sudo certbot --nginx -d YOUR_DOMAIN
  ```

---

## Phase 3: Clone & Start Helm

- [ ] **3.1** Clone the repository on your VM
  ```bash
  cd ~
  git clone https://github.com/YOUR_USERNAME/helm.git
  cd helm
  ```

- [ ] **3.2** Install web app dependencies
  ```bash
  cd web && npm install
  ```

- [ ] **3.3** Build the web app
  ```bash
  npm run build
  ```

- [ ] **3.4** Start with PM2
  ```bash
  pm2 start npm --name "helm" -- start
  pm2 save
  ```

- [ ] **3.5** Enable auto-start on reboot
  ```bash
  pm2 startup
  # Run the command it outputs
  ```

- [ ] **3.6** Verify web app is running
  ```bash
  curl http://localhost:3000
  ```

---

## Phase 4: Install Claude Code on VM

- [ ] **4.1** Install Claude Code CLI
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

- [ ] **4.2** Authenticate Claude Code
  ```bash
  claude
  # Follow the prompts to log in
  ```

- [ ] **4.3** Install Playwright plugin
  ```bash
  claude /install-plugin playwright@claude-plugins-official
  ```

- [ ] **4.4** (Optional) Install Ralph Loop plugin
  ```bash
  claude /install-plugin ralph-loop@claude-plugins-official
  ```

---

## Phase 5: Google Cloud Setup

### Create Project & Enable APIs

- [ ] **5.1** Go to [Google Cloud Console](https://console.cloud.google.com/)

- [ ] **5.2** Create a new project
  - Click the project dropdown (top left, next to "Google Cloud")
  - Click "New Project"
  - Name it "Helm Assistant" (or similar)
  - Click "Create"
  - Wait for creation, then select the new project from the dropdown

- [ ] **5.3** Enable Gmail API
  - Go to **APIs & Services → Library** (left sidebar)
  - Search for "Gmail API"
  - Click on it → Click **Enable**

- [ ] **5.4** Enable Google Calendar API
  - Go to **APIs & Services → Library**
  - Search for "Google Calendar API"
  - Click on it → Click **Enable**

### Configure OAuth Consent Screen

- [ ] **5.5** Go to **APIs & Services → OAuth consent screen** (left sidebar)

- [ ] **5.6** Select User Type
  - Choose **External** (allows any Google account)
  - Click "Create"

- [ ] **5.7** Fill in App Information (Step 1 of 4)
  - **App name:** "Helm Assistant"
  - **User support email:** Select your email
  - **Developer contact information:** Enter your email
  - Click "Save and Continue"

- [ ] **5.8** Add Scopes (Step 2 of 4)
  - Click "Add or Remove Scopes"
  - In the filter box, search and check these scopes:
    - `https://www.googleapis.com/auth/gmail.readonly`
    - `https://www.googleapis.com/auth/gmail.send`
    - `https://www.googleapis.com/auth/gmail.modify`
    - `https://www.googleapis.com/auth/calendar`
  - Click "Update" at bottom
  - Click "Save and Continue"

- [ ] **5.9** Test Users (Step 3 of 4)
  - Skip this for now (we'll publish the app instead)
  - Click "Save and Continue"

- [ ] **5.10** Review Summary (Step 4 of 4)
  - Review your settings
  - Click "Back to Dashboard"

- [ ] **5.11** **CRITICAL: Publish the App**
  - On the OAuth consent screen dashboard, find "Publishing status"
  - It will say "Testing" - click **"Publish App"**
  - Confirm by clicking "Confirm"

  **Why this matters:**
  - In "Testing" mode, tokens expire after **7 days**
  - In "Production" mode, refresh tokens **don't expire**
  - Your app will show an "unverified" warning to users, but that's fine for personal use
  - Users click "Advanced" → "Go to [App Name] (unsafe)" to proceed

### Create OAuth Credentials

- [ ] **5.12** Go to **APIs & Services → Credentials** (left sidebar)

- [ ] **5.13** Click **"+ Create Credentials"** → **"OAuth client ID"**

- [ ] **5.14** Configure the OAuth client
  - **Application type:** Select **"Desktop app"** (NOT "Web application")
  - **Name:** "Helm CLI" (or any name)
  - Click "Create"

- [ ] **5.15** Download credentials
  - A popup shows your Client ID and Client Secret
  - Click **"Download JSON"**
  - Save the file (it will be named like `client_secret_XXXXX.json`)

- [ ] **5.16** Note your credentials (you'll need these later):
  - **Client ID:** `____________________.apps.googleusercontent.com`
  - **Client Secret:** `GOCSPX-____________________`

- [ ] **5.17** Verify the downloaded JSON looks like this:
  ```json
  {
    "installed": {
      "client_id": "123456789-xxxxx.apps.googleusercontent.com",
      "project_id": "helm-assistant-123456",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "GOCSPX-xxxxxxxxxxxxxxxxxxxx",
      "redirect_uris": ["http://localhost"]
    }
  }
  ```

  **Important:** The top-level key must be `"installed"` (for Desktop apps).
  If it says `"web"`, you created a Web application - delete it and create a Desktop app instead.

---

## Phase 6: MCP Server Setup

### Install Gmail MCP Server

- [ ] **6.1** Clone and build the Gmail MCP server
  ```bash
  mkdir -p ~/mcp-servers && cd ~/mcp-servers
  git clone https://github.com/anthropics/gmail-mcp.git
  cd gmail-mcp && npm install && npm run build
  ```

### Create MCP Configuration

- [ ] **6.2** Create credentials directory
  ```bash
  mkdir -p ~/.gmail-mcp/accounts
  ```

- [ ] **6.3** Save your OAuth credentials (paste the JSON from Phase 5.7)
  ```bash
  nano ~/.gmail-mcp/gcp-oauth.keys.json
  ```

- [ ] **6.4** Create `.mcp.json` in your helm directory
  ```bash
  cat > ~/helm/.mcp.json << 'EOF'
  {
    "mcpServers": {
      "gmail": {
        "command": "node",
        "args": ["/home/ubuntu/mcp-servers/gmail-mcp/build/index.js"],
        "env": {
          "CREDENTIALS_PATH": "/home/ubuntu/.gmail-mcp/gcp-oauth.keys.json",
          "ACCOUNTS_PATH": "/home/ubuntu/.gmail-mcp/accounts"
        }
      },
      "calendar": {
        "command": "npx",
        "args": ["@cocal/google-calendar-mcp"],
        "env": {
          "GOOGLE_OAUTH_CREDENTIALS": "/home/ubuntu/.gmail-mcp/gcp-oauth.keys.json"
        }
      }
    }
  }
  EOF
  ```

- [ ] **6.5** Create symlinks for Gmail MCP (it looks in working directory)
  ```bash
  ln -sf ~/.gmail-mcp/gcp-oauth.keys.json ~/helm/credentials.json
  ln -sfn ~/.gmail-mcp/accounts ~/helm/accounts
  ```

### Manual OAuth Authentication (Headless Server)

On a headless server, you can't use browser-based OAuth directly. Instead, use manual token exchange:

- [ ] **6.6** Generate auth URLs for each account

  **The OAuth URL pattern:**
  ```
  https://accounts.google.com/o/oauth2/auth?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=http://localhost&
    response_type=code&
    scope=SCOPES&
    access_type=offline&
    prompt=consent
  ```

  **For Gmail (replace YOUR_CLIENT_ID):**
  ```
  https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.modify&access_type=offline&prompt=consent
  ```

  **For Calendar (replace YOUR_CLIENT_ID):**
  ```
  https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent
  ```

- [ ] **6.7** For each email account you want to authenticate:
  1. Open the auth URL in your local browser
  2. Sign in with the Google account
  3. Click through the "unverified app" warning (Advanced → Continue)
  4. Grant permissions
  5. You'll be redirected to: `http://localhost/?code=4/0XXXXX&scope=...`
  6. Copy the `code=` value (everything between `code=` and `&scope`)

- [ ] **6.8** Exchange auth codes for tokens

  For each account, run this curl command (replace CODE, CLIENT_ID, CLIENT_SECRET):
  ```bash
  curl -s -X POST https://oauth2.googleapis.com/token \
    -d "code=YOUR_AUTH_CODE" \
    -d "client_id=YOUR_CLIENT_ID" \
    -d "client_secret=YOUR_CLIENT_SECRET" \
    -d "redirect_uri=http://localhost" \
    -d "grant_type=authorization_code"
  ```

  This returns JSON with `access_token` and `refresh_token`.

### Save Gmail Tokens

- [ ] **6.9** For each Gmail account, create a token file:
  ```bash
  mkdir -p ~/.gmail-mcp/accounts/user@gmail.com
  cat > ~/.gmail-mcp/accounts/user@gmail.com/token.json << 'EOF'
  {
    "type": "authorized_user",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "REFRESH_TOKEN_FROM_CURL"
  }
  EOF
  ```

- [ ] **6.10** Create the Gmail accounts registry:
  ```bash
  cat > ~/.gmail-mcp/accounts/config.json << 'EOF'
  {
    "accounts": {
      "user@gmail.com": {
        "email": "user@gmail.com",
        "addedAt": "2026-01-01T00:00:00.000Z"
      }
    },
    "defaultAccount": "user@gmail.com"
  }
  EOF
  ```

### Save Calendar Tokens

- [ ] **6.11** Create calendar tokens directory:
  ```bash
  mkdir -p ~/.config/google-calendar-mcp
  ```

- [ ] **6.12** Create calendar tokens file:
  ```bash
  cat > ~/.config/google-calendar-mcp/tokens.json << 'EOF'
  {
    "personal": {
      "access_token": "ACCESS_TOKEN_FROM_CURL",
      "refresh_token": "REFRESH_TOKEN_FROM_CURL",
      "scope": "https://www.googleapis.com/auth/calendar",
      "token_type": "Bearer",
      "expiry_date": 1767998205526
    }
  }
  EOF
  ```
  Note: The key (e.g., "personal") is the account nickname used in calendar commands.

### Verify MCP Connections

- [ ] **6.13** Restart Claude Code to load MCP servers
  ```bash
  cd ~/helm && claude
  ```

- [ ] **6.14** Test Gmail MCP
  ```
  > List my Gmail accounts
  > Search my emails for "test"
  ```

- [ ] **6.15** Test Calendar MCP
  ```
  > List my calendars
  > What events do I have today?
  ```

### Adding More Accounts Later

To add additional Gmail/Calendar accounts:
1. Generate auth URL with appropriate scopes
2. Open in browser, complete auth, get the code
3. Exchange code for tokens via curl
4. Add token file to appropriate directory
5. Update config.json (Gmail) or tokens.json (Calendar)

---

## Phase 7: Notifications Setup

- [ ] **7.1** Choose a unique ntfy.sh topic name: `__________________`
  - Example: `helm-alerts-abc123`

- [ ] **7.2** Subscribe on your phone
  - Install ntfy app (iOS/Android)
  - Subscribe to your topic

- [ ] **7.3** Update notification script
  ```bash
  nano ~/helm/scripts/notifications/remind.sh
  # Update NTFY_TOPIC="your-topic-name"
  ```

- [ ] **7.4** Test notification
  ```bash
  ~/helm/scripts/notifications/remind.sh "Test notification"
  # Should appear on your phone
  ```

---

## Phase 8: Context Structure Setup

- [ ] **8.1** The context files are already set up with templates
  - Review files in `~/helm/context/` and customize for your needs

- [ ] **8.2** Customize CLAUDE.md
  ```bash
  cp ~/helm/templates/CLAUDE.md ~/helm/CLAUDE.md
  nano ~/helm/CLAUDE.md
  # Customize the instructions for your use case
  ```

---

## Phase 9: Initial Context Backfill

**The golden rule: The more context you provide, the better the assistant becomes.**

### Automated Backfill

- [ ] **9.1** Calendar backfill - Ask Claude:
  > "Scan my Google Calendar for the past 30 days and extract recurring appointments, upcoming deadlines, and important events. Save to context/strategy/timeline.md"

- [ ] **9.2** Email backfill - Ask Claude:
  > "Search my emails from the past 2 weeks for action items, deadlines, important contacts, and pending follow-ups. Update the appropriate context files."

- [ ] **9.3** Medical history backfill - Tell Claude about:
  - Current medications and dosages
  - Chronic conditions
  - Past surgeries or major medical events
  - Allergies
  - Current doctors and specialists

### Health Apps & Wearables (Optional)

- [ ] **9.4** Connect wearables if applicable
  - Oura: `npx @anthropic/oura-mcp auth`
  - Search others: `npx @anthropic/mcp-registry search health`

### Stream of Consciousness Context

- [ ] **9.5** Share comprehensive personal context with Claude:

Tell Claude everything about your life:

**BASICS:** Name, age, pronouns, location, living situation, job/school, income

**HEALTH:** Medical conditions, medications, mental health, sleep issues, diet, exercise, substances

**RELATIONSHIPS:** Family, friends, professional contacts, relationship dynamics

**GOALS:** This year's goals, long-term goals, career aspirations, health goals

**STRESSORS:** Current stress sources, challenges, anxieties, deadlines

**HISTORY:** Major life events, past jobs, education, significant challenges overcome

**PREFERENCES:** Communication style, motivations, hobbies, daily routine

### Extract from Other AI Services

- [ ] **9.6** (Optional) Export context from ChatGPT/other AI

Send this prompt to your other AI:
> "I'm setting up a new personal assistant. Please provide a comprehensive summary of everything you know about me: personal details, health, relationships, job, goals, challenges, preferences, important dates. Format as detailed bullet points."

Then paste the response into Claude Code to organize into context files.

---

## Phase 10: Recurring Jobs Setup

- [ ] **10.1** Set up daily context auto-commit
  ```bash
  crontab -e
  # Add:
  59 23 * * * cd /home/ubuntu/helm && git add context/ && git commit -m "Auto-save context" 2>/dev/null || true
  ```

- [ ] **10.2** (Optional) Set up notification schedules
  ```bash
  crontab -e
  # Examples (times in UTC):
  # Morning briefing at 8am PST (16:00 UTC):
  0 16 * * * /home/ubuntu/helm/scripts/notifications/send.sh morning
  # Evening check-in at 6pm PST (02:00 UTC next day):
  0 2 * * * /home/ubuntu/helm/scripts/notifications/send.sh evening
  ```

---

## Phase 11: Mobile PWA Installation

- [ ] **11.1** Open site on phone
  - Safari (iOS) or Chrome (Android)
  - Navigate to `https://YOUR_DOMAIN`

- [ ] **11.2** Add to Home Screen
  - **iOS:** Share button → "Add to Home Screen" → Add
  - **Android:** Three-dot menu → "Add to Home screen" → Add

- [ ] **11.3** Verify PWA opens full-screen without browser chrome

---

## Setup Complete!

- [ ] **All phases completed** - Your Helm instance is ready!

### Next Steps

1. **Use it daily** - Log meals, moods, tasks, and updates
2. **Refine CLAUDE.md** - Tune instructions based on experience
3. **Add integrations** - iMessage, Slack, Notion, etc.
4. **Build habits** - Morning check-ins, evening reviews

---

## Troubleshooting

**MCP servers not connecting:**
```bash
ls ~/.google-calendar-mcp/
ls ~/.gmail-mcp/
npx @cocal/google-calendar-mcp  # Re-auth if needed
```

**Web app not starting:**
```bash
pm2 logs helm
pm2 restart helm
```

**Notifications not arriving:**
```bash
curl -d "Test" ntfy.sh/YOUR_TOPIC
```

**SSL issues:**
```bash
sudo certbot renew --dry-run
```

---

## Optional: iMessage Integration

Requires a Mac that stays running. Search for community iMessage MCP servers.

---

## Resources

- Claude Code: https://docs.anthropic.com/claude-code
- MCP Protocol: https://modelcontextprotocol.io/
- ntfy.sh: https://docs.ntfy.sh/
