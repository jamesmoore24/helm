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

- [ ] **5.1** Go to [Google Cloud Console](https://console.cloud.google.com/)

- [ ] **5.2** Create a new project named "Helm Assistant"

- [ ] **5.3** Enable Gmail API
  - Go to APIs & Services → Library → Search "Gmail API" → Enable

- [ ] **5.4** Enable Google Calendar API
  - Go to APIs & Services → Library → Search "Google Calendar API" → Enable

- [ ] **5.5** Configure OAuth consent screen
  - Go to APIs & Services → OAuth consent screen
  - Choose External, fill in app name
  - Add your email as test user
  - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `calendar`, `calendar.events`

- [ ] **5.6** Create OAuth credentials
  - Go to APIs & Services → Credentials
  - Create Credentials → OAuth client ID → Desktop application
  - Download the JSON file

- [ ] **5.7** Upload credentials to VM
  ```bash
  # From your local machine:
  scp ~/Downloads/client_secret_*.json ubuntu@YOUR_SERVER_IP:~/credentials.json
  ```

---

## Phase 6: MCP Server Setup

### Google Calendar MCP

- [ ] **6.1** Create config directory
  ```bash
  mkdir -p ~/.google-calendar-mcp
  ```

- [ ] **6.2** Copy credentials
  ```bash
  cp ~/credentials.json ~/.google-calendar-mcp/gcp-oauth.keys.json
  ```

- [ ] **6.3** Authenticate Calendar MCP
  ```bash
  npx @cocal/google-calendar-mcp
  # Follow browser prompts, add account with nickname (e.g., "personal")
  ```

### Gmail MCP

- [ ] **6.4** Create Gmail MCP config directory
  ```bash
  mkdir -p ~/.gmail-mcp
  ```

- [ ] **6.5** Copy credentials for Gmail
  ```bash
  cp ~/credentials.json ~/.gmail-mcp/gcp-oauth.keys.json
  ```

- [ ] **6.6** Authenticate Gmail MCP
  ```bash
  npx @anthropic/gmail-mcp auth
  ```

- [ ] **6.7** (Optional) Add second Gmail account
  ```bash
  mkdir -p ~/.gmail-mcp-work
  cp ~/credentials.json ~/.gmail-mcp-work/gcp-oauth.keys.json
  GMAIL_MCP_CONFIG_DIR=~/.gmail-mcp-work npx @anthropic/gmail-mcp auth
  ```

### Verify MCP Connections

- [ ] **6.8** Test MCP in Claude Code
  ```bash
  cd ~/helm && claude
  # Try: "List my calendars" and "Show my recent emails"
  ```

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
