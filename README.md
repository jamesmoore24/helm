# Helm

**Stop re-explaining your life to AI.**

Helm gives Claude persistent memory, access to your apps, and the ability to take action. For ~$30/month (Claude Pro + a small VPS), you get:

- **Makes decisions for you** - Not just answers questions, but takes action. Schedules your day, sends emails, manages your calendar, sets reminders.
- **Knows everything about you** - Persistent memory across every conversation. Your goals, health patterns, relationships, commitments - all in context, always.
- **Integrates with your life** - Gmail, Google Calendar, Slack, and any MCP-compatible service. Garmin, Whoop, Oura for health data. Browser automation for anything else.
- **Runs autonomously** - Morning briefings, medication reminders, deadline alerts. Works while you sleep.
- **Fixed monthly cost** - No per-token billing surprises. Predictable spend, unlimited usage.

This isn't a chatbot. It's a second brain that actually executes.

---

## What Makes This Different

| Without Helm | With Helm |
|--------------|-----------|
| "Let me catch you up on my situation..." | Already knows your full context |
| Copy-paste emails, calendars, health data | Pulls directly from your apps |
| "Here's what you should do..." | Actually does it (sends emails, creates events) |
| Re-explain your goals every session | Goals, constraints, history always in context |
| Chatbot you visit | Assistant that works for you 24/7 |

---

## The Stack

- **Claude Code** - Anthropic's agentic coding assistant as the brain
- **MCP Servers** - Connect to Gmail, Calendar, Slack, health wearables, and more
- **Structured Context** - Markdown files that give Claude deep knowledge of your life
- **Web UI + PWA** - Access from your phone like a native app
- **Push Notifications** - Reminders and alerts via ntfy.sh

## Architecture

```
helm/
├── CLAUDE.md                   # Instructions for the AI (customize this)
├── templates/                  # Onboarding docs and blank templates
│   ├── ONBOARDING.md           # Step-by-step setup guide
│   └── CLAUDE.md               # Template for customization
├── context/                    # Your personal context (gitignored if private)
│   ├── tasks.md                # Task backlog
│   ├── logs/                   # Time-series data
│   │   ├── health-log.md
│   │   ├── food-log.md
│   │   ├── career-log.md
│   │   └── relationships-log.md
│   ├── strategy/               # Planning & goals
│   │   ├── goals.md
│   │   ├── current-state.md
│   │   └── timeline.md
│   └── reference/              # Static information
│       ├── resources.md
│       └── medications.md
├── scripts/                    # Automation
│   └── notifications/          # ntfy.sh integration
└── web/                        # Optional web UI (Next.js)
```

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/YOUR_USERNAME/helm.git
cd helm
```

### 2. Follow Onboarding

Open `templates/ONBOARDING.md` for the complete setup guide, or run:

```bash
claude
```

Then tell Claude: "Help me set this up"

### 3. Start Using

Once configured, interact via:
- **CLI:** `cd helm && claude`
- **Web UI:** Deploy the Next.js app (optional)
- **Mobile:** PWA support for phone access

## Key Features

### Persistent Context
Every conversation has access to your full life context. No more re-explaining your situation.

### Health-First Framework
The assistant checks your health status before suggesting tasks. Sleep-deprived? It won't pile on work.

### Smart File Structure
Append-only logs with "Current Status" summaries. Query recent state quickly, full history available.

### Push Notifications
Via [ntfy.sh](https://ntfy.sh) - free, no account required. Set reminders, get briefings.

### Integrations via MCP
Connect to everything in your life:

| Category | Services |
|----------|----------|
| **Communication** | Gmail, Slack, iMessage (Mac required) |
| **Calendar** | Google Calendar, Outlook |
| **Health & Fitness** | Oura, Whoop, Garmin, Apple Health |
| **Productivity** | Notion, Linear, GitHub |
| **Browser** | Playwright (automate any website) |

Browse more at the [MCP Registry](https://github.com/modelcontextprotocol)

## Philosophy

1. **Context is king** - The more the AI knows, the better it helps
2. **Single source of truth** - One file per domain, append-only
3. **Health multiplies everything** - Poor health tanks all other goals
4. **Simple execution** - AI handles complexity, you get clear actions

## Requirements

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- Node.js 20+
- Linux VM (for 24/7 availability) or local machine
- Google Cloud project (for Gmail/Calendar APIs)

## Documentation

- [Setup Guide](templates/ONBOARDING.md) - Complete installation walkthrough
- [CLAUDE.md](templates/CLAUDE.md) - Template for AI instructions

## License

MIT
