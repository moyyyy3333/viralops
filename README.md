# ViralOps — AI Marketing Agent Team

**5 autonomous agents. One command. Full viral content pipeline.**

```
Research → Clip → Edit → Post → Finance
   ↓         ↓        ↓       ↓        ↓
Perplexity  yt-dlp  FFmpeg   X/TikTok/  Stripe
 + Claude   + AI    + Captions YouTube   + Revenue
```

## Why This Beats the Competition

| Feature | Others | ViralOps |
|---------|--------|----------|
| **Real API execution** | Mock/TODOs | Perplexity, yt-dlp, FFmpeg, Stripe, X, TikTok, YouTube |
| **Parallel agents** | Sequential | Parallel where dependencies allow |
| **Self-healing** | Crashes on error | 3 retries, exponential backoff, circuit breakers |
| **Cost tracking** | None | Per-agent token + API cost tracking |
| **Graceful degradation** | All-or-nothing | Works with 0 API keys (mock mode) |
| **Event bus** | None | Inter-agent pub/sub with progress events |
| **Observability** | Console.log | Structured pino logging + Supabase persistence |
| **Smart orchestration** | Simple scripts | Priority task queue, circuit breakers, partial completion |

## The 5 Agents

| # | Agent | What It Does | APIs Used |
|---|-------|-------------|-----------|
| 1 | **Research** | Discovers trending viral content, scores viral potential | Perplexity AI + Claude |
| 2 | **Clip** | Downloads videos, identifies viral-worthy moments with AI | yt-dlp + FFmpeg + Claude |
| 3 | **Edit** | Auto-captions, formats for each platform, adds hook overlays | FFmpeg + Claude |
| 4 | **Post** | Publishes to X/Twitter, TikTok, YouTube, Instagram | X API v2, TikTok API, YouTube Data API |
| 5 | **Finance** | Tracks revenue, processes payouts, generates financial reports | Stripe SDK + Claude |

## Quick Start

### Prerequisites
- Node.js 20+
- `brew install yt-dlp ffmpeg` (optional — system works without them)

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Add your API keys (or run without any — works in mock mode)
cp .env.example .env
# Edit .env with your keys

# 3. Run the full pipeline — ONE COMMAND
npx tsx src/index.ts run

# 4. Run with a specific niche
npx tsx src/index.ts run --niche "AI technology"

# 5. Dry run (no actual posting)
npx tsx src/index.ts run --dry-run

# 6. Run specific agent only
npx tsx src/index.ts run --agent research
```

## CLI Commands

```bash
viralops run              # Full pipeline execution
viralops run --niche "AI" # Custom niche
viralops run --dry-run    # Simulate without posting
viralops status           # Check pipeline status
viralops logs --tail 50   # View recent logs
viralops analytics        # Cost & performance report
viralops setup            # Database setup
```

## Environment Variables

```env
# Required for AI brain
ANTHROPIC_API_KEY=sk-ant-api03-...

# Required for research
PERPLEXITY_API_KEY=pplx-...

# Required for database (optional — works without)
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=ey...

# Required for finance
STRIPE_SECRET_KEY=sk_live_...

# Required for posting
X_API_KEY=... X_API_SECRET=... X_ACCESS_TOKEN=... X_ACCESS_SECRET=...
YOUTUBE_API_KEY=...
TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=...
```

**Works with ZERO API keys configured.** Every service has realistic mock data fallback, so you can develop and test immediately.

## Project Structure

```
viralops-agents/
├── src/
│   ├── index.ts              # CLI entry point (Commander.js)
│   ├── orchestrator.ts       # Pipeline supervisor + task queue
│   ├── config.ts             # Environment config loader
│   ├── logger.ts             # Structured logging (pino)
│   ├── eventBus.ts           # Inter-agent pub/sub
│   ├── costTracker.ts        # Per-agent cost tracking
│   ├── types.ts              # All TypeScript types
│   ├── db.ts                 # Supabase client
│   ├── claude.ts             # Anthropic Claude API client
│   ├── agents/
│   │   ├── researchAgent.ts  # Discovers viral content
│   │   ├── clipAgent.ts      # Downloads & extracts segments
│   │   ├── editAgent.ts      # Auto-captions & formats
│   │   ├── postAgent.ts      # Publishes to platforms
│   │   └── financeAgent.ts   # Revenue tracking & payouts
│   ├── services/
│   │   ├── perplexity.ts     # Perplexity AI search
│   │   ├── ytdlp.ts          # Video downloading
│   │   ├── ffmpeg.ts         # Video processing
│   │   ├── xApi.ts           # X/Twitter API v2
│   │   ├── tiktokApi.ts      # TikTok upload API
│   │   ├── youtubeApi.ts     # YouTube Data API
│   │   ├── stripe.ts         # Stripe SDK
│   │   └── index.ts          # Barrel exports
│   └── utils/
│       ├── retry.ts          # Exponential backoff + circuit breaker
│       ├── fileStorage.ts    # Local file management
│       └── validators.ts     # URL validation, formatting
├── output/                   # Generated content
├── logs/                     # Execution logs
├── .env.example
├── package.json
└── tsconfig.json
```

## Architecture

### Supervisor + Worker Pattern
```
Orchestrator manages 5 agents through:
├── Priority task queue (Research runs first)
├── Parallel execution (Finance runs alongside Post)
├── Exponential backoff retries (2s → 4s → 8s)
├── Circuit breakers (3 failures = 60s cooldown)
├── Cost tracking (per agent, per API call)
└── Event bus (real-time progress updates)
```

### Graceful Degradation Chain
```
Perplexity fails → fallback to mock trending topics
Claude offline → heuristic scoring + default captions
yt-dlp missing → mock video paths
FFmpeg missing → edit plans without processing
Stripe offline → realistic mock transactions
X/TikTok/YouTube not configured → mock post URLs
```

### Database Schema (Supabase)
```sql
pipeline_runs — pipeline execution records
tasks — per-agent task tracking
content_items — generated videos & posts
agent_logs — structured agent event logs
transactions — financial records
```

## Tech Stack

- **TypeScript + Node.js 20** — Core runtime
- **Anthropic Claude API** — Agent brain (analysis, captions, scoring)
- **Perplexity AI** — Real-time trend research
- **yt-dlp** — Video downloading from any platform
- **FFmpeg** — Video editing, captions, formatting
- **Stripe SDK** — Payment processing & revenue tracking
- **X API v2, TikTok API, YouTube Data API** — Social publishing
- **Supabase** — Database & event persistence
- **pino** — Structured logging
- **Commander.js** — CLI interface

## License

MIT — Built for DealerMattAI
