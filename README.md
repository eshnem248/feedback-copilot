# Feedback Intelligence Copilot

An AI-first feedback exploration tool for Product Managers with advanced features for analysis, visualization, and action.

## Background
Product managers are responsible for turning fragmented signals into clear product stories that drive decisions. In practice, feedback is often lost across tools and platforms, making it hard to understand where issues originate and why they occur. The Feedback Intelligence Copilot helps PMs navigate this ambiguity by turning natural-language questions into structured insights across multiple feedback sources. Overall, it helps PMs cut noise, amplify signal, and translate scattered feedback into structured insights and results.

### 🌅 Morning Briefing Mode
Start your day with an automated summary:
- This week's total feedback count
- Urgent items requiring attention
- Top 3 pain points with complaint counts
- Critical items (last 3 days)
- Positive wins to celebrate

Access via the ☀️ button or press `B`

### 📈 Trend Sparklines
Each theme now shows a 7-day activity chart:
- Visual trajectory at a glance
- Color-coded (red for negative trends)
- Trend indicators (↑↓→)

### 🗺️ Theme Clustering Map
Visual bubble chart showing:
- Related themes grouped together
- Bubble size = frequency
- Click to drill down into a cluster
- See connections between issues

### 📋 Auto-Generated Action Items
AI converts insights into actionable tickets:
- Title + description
- Priority (P0/P1/P2)
- Type (bug/feature/docs/ops)
- Effort estimate (small/medium/large)
- **One-click "Copy as Jira"** button

### ⌨️ Keyboard Shortcuts
Power user productivity:
| Shortcut | Action |
|----------|--------|
| `⌘K` | Focus search |
| `1-5` | Toggle sources |
| `B` | Morning briefing |
| `?` | Show shortcuts |
| `Esc` | Close modals |

### 💬 Conversation History
- Previous Q&A pairs shown above results
- Context preserved across questions
- Easy to track your exploration path

### 📤 Smart Export
Multiple export formats:
- **Markdown** - Full analysis with formatting
- **Slack** - Ready to paste with emoji
- **Jira** - Per-action-item ticket format

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────┐     ┌─────────┐     ┌────────────────┐     │
│   │  Worker   │────▶│   D1    │     │   Workers AI   │     │
│   │  (API)    │     │ (SQLite)│     │  (Llama 3.1)   │     │
│   └─────┬─────┘     └─────────┘     └───────▲────────┘     │
│         │                                    │              │
│         └────────────────────────────────────┘              │
│                                                             │
│   Endpoints:                                                │
│   • GET  /              → Frontend                          │
│   • GET  /api/sources   → Source counts + sentiment         │
│   • GET  /api/briefing  → Morning briefing data             │
│   • GET  /api/trends    → Theme trends over time            │
│   • POST /api/analyze   → AI-powered analysis               │
│   • GET  /api/init      → Initialize database               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cloudflare Products

| Product | Purpose |
|---------|---------|
| **Workers** | API endpoints + serves frontend |
| **D1** | SQLite database for feedback storage |
| **Workers AI** | Llama 3.1 8B for analysis & action generation |

## 🚀 Quick Start

```bash
# Install
npm install

# Login to Cloudflare
wrangler login

# Create database
wrangler d1 create feedback-db

# Update wrangler.toml with your database_id

# Deploy
npx wrangler deploy

# Visit your URL and click "Initialize"
```

## 📊 API Reference

### GET /api/briefing
Returns morning briefing data:
```json
{
  "stats": {
    "total": 30,
    "today": 5,
    "negative": 12,
    "positive": 10,
    "urgent": 4
  },
  "topIssues": [
    {"product_area": "api", "count": 8}
  ],
  "criticalItems": [
    {"source": "twitter", "content": "API down..."}
  ],
  "positiveWins": [
    {"content": "Love the new dashboard!"}
  ]
}
```

### POST /api/analyze
Enhanced response with actions and clusters:
```json
{
  "summary": "...",
  "themes": [
    {
      "name": "API Reliability",
      "description": "...",
      "sentiment": "negative",
      "trend": "up",
      "trendData": [3, 5, 2, 7, 4, 6, 8]
    }
  ],
  "actions": [
    {
      "title": "Investigate 502 errors",
      "description": "Debug /v2/analyze endpoint",
      "priority": "P0",
      "type": "bug",
      "effort": "medium"
    }
  ],
  "clusters": [
    {
      "id": "reliability",
      "name": "Reliability Issues",
      "themes": ["API errors", "Latency"],
      "size": 5,
      "x": 30,
      "y": 40
    }
  ],
  "followups": ["..."]
}
```

## 🎨 UI Features

### Collapsible Sections
- Summary always visible
- Action Items open by default
- Other sections collapsed
- Click header to toggle

### Visual Indicators
- Sentiment dots (🟢 positive, 🔴 negative, 🟡 mixed)
- Trend arrows (↑ increasing, ↓ decreasing, → stable)
- Priority badges (P0 red, P1 yellow, P2 gray)
- Urgency dots on risks

### Export Formats

**Markdown:**
```markdown
# Feedback Analysis

## Summary
Users are frustrated with...

## Key Themes
- **API Reliability** (↑): 502 errors affecting...

## Action Items
- [P0] Investigate 502 errors: Debug endpoint
```

**Slack:**
```
*📊 Feedback Analysis*

*Summary:* Users are frustrated with...

*Key Themes:*
• API Reliability :chart_with_upwards_trend:

*Action Items:*
• [P0] Investigate 502 errors
```

## 📁 Project Structure

```
feedback-copilot-v4/
├── src/
│   └── index.js      # Everything in one file
├── wrangler.toml     # Cloudflare config
├── package.json
└── README.md
```

## 🔮 Future Ideas

- [ ] Email/Slack scheduled digests
- [ ] Custom alert thresholds
- [ ] Team collaboration features
- [ ] Integration with Linear/Jira APIs
- [ ] Voice summary (text-to-speech)
- [ ] Comparison mode (source vs source)

## License

MIT
