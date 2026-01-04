# 🤖 Lenny Bot

An intelligent Q&A agent for AccuLynx that understands the entire platform and can answer questions about any aspect of the software.

---

### 🤖 AI Agents: Start Here

**If you're an AI agent (Claude, GPT, etc.), read `docs/AI_AGENT_QUICKSTART.md` first.**

Key rules:
- Use `scripts/crawler_utils.py` for ALL database operations
- Never write inline Python for saves/inserts
- Run `python scripts/crawler_utils.py unexplored` to see work queue
- Check `.cursorrules` for project conventions

---

## 🎯 Project Goals

1. **Q&A Agent**: Answer questions like "How do I create a job?" or "What reports are available?"
2. **KB-Guided Crawling**: Use KB knowledge to intelligently crawl the web app
3. **AI-Powered Understanding**: GPT-4o generates descriptions with KB context
4. **RAG Search**: Vector embeddings enable semantic search across all content

### Future: Action Agent (Optional)

The architecture preserves the ability to add Action Agent features later:
- Element-level labeling for GUI automation
- Form filling and submission
- Network monitoring for data modification tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LENNY BOT                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Data Collection          Agent (RunPod)      Admin (Vercel)│
│  ────────────────         ──────────────      ──────────────│
│  • KB Scraper ✓           • Self-hosted LLM   • Next.js UI  │
│  • Video Processor ✓      • RAG Pipeline ✓    • Data Mgmt   │
│  • KB-Guided Crawler      • Guardrails        • Chat Test   │
│  • AI Descriptions        • Embeddings ✓      • Sitemap View│
│                                                              │
│                    ┌─────────────────┐                      │
│                    │    Supabase     │                      │
│                    │  • PostgreSQL   │                      │
│                    │  • pgvector     │                      │
│                    │  • Storage      │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Current Progress

### ✅ Phase 1: Knowledge Base (COMPLETE)
- [x] KB scraper (297 articles discovered)
- [x] Video discovery (115 videos found)
- [x] Video processing pipeline (transcription + frame analysis)
- [x] 6,322 video steps extracted

### ✅ Phase 2: RAG Pipeline (COMPLETE)
- [x] pgvector extension and embedding schema
- [x] Embedding generator (content, video steps, summaries)
- [x] Semantic search with similarity scoring
- [x] Q&A chain with LLM integration
- [x] Swappable LLM provider (OpenAI, Claude, Ollama)
- [x] Interactive chat CLI (ask_lenny.py)

### 🧹 Phase 3: Fresh Start Cleanup (COMPLETE - Dec 22, 2024)
- [x] Archived old app crawl data (156 pages → `_archived_app_pages`)
- [x] Archived navigation data (236 items → `_archived_global_nav_items`)
- [x] Archived 102 old files to `_archived/`
- [x] Deleted regenerating directories (chrome_profile, browser-data)
- [x] Created fresh schema for KB-guided crawling

### ✅ Phase 4: KB Analysis (COMPLETE - Dec 22, 2024)
> See: `docs/EPIC_KB_GUIDED_CRAWLING.md` for full epic documentation

Analyzed KB embeddings to understand AccuLynx:
- [x] Extracted 21 product areas from KB articles
- [x] Identified 20 key features with product area mappings
- [x] Calendar deep dive for first product area
- [x] Saved analysis to `docs/kb_analysis_*.md`

### ⏳ Phase 5: KB-Guided App Crawling (IN PROGRESS)
> Epic documentation: `docs/EPIC_KB_GUIDED_CRAWLING.md`
> Crawler approach: `docs/AI_CRAWLER_APPROACH.md`

Feature-centric crawl of app with KB context:
- [x] Create global context document (`docs/GLOBAL_CONTEXT.md`)
- [x] Build feature-centric database schema (13 product areas seeded)
- [x] **Claude-as-Crawler approach** - using Claude in Cursor as intelligent agent
- [ ] Crawl Job Overview + tabs (starting point)
- [ ] Flag unknown items for human review
- [ ] Generate feature → location mappings

**Crawler Approach**: Instead of Python code, we use Claude in Cursor with MCP browser tools. This eliminates code maintenance while providing intelligent, context-aware crawling. See `docs/AI_CRAWLER_APPROACH.md`.

### ✅ Phase 6: Admin Review UI (SETUP COMPLETE)

React app styled like AccuLynx for reviewing crawl results:
- [x] Set up React + Vite + TypeScript project (`/admin`)
- [x] AccuLynx design system extraction + showcase page
- [ ] Page browser with screenshots (after first crawl)
- [ ] Actions inventory per page
- [ ] **Product areas & features viewer**
- [ ] Unknown items review queue
- [ ] Gap report (KB vs app)

### ⏳ Phase 7: Agent Development (FUTURE)
- [ ] RunPod infrastructure setup
- [ ] Self-hosted LLM deployment
- [ ] RAG integration
- [ ] Guardrails configuration

---

## 📊 Database Status

### Active Tables (Ready for Use)

| Table | Rows | Description |
|-------|------|-------------|
| `source_urls` | 297 | KB article URLs |
| `content_chunks` | 150 | KB content with embeddings |
| `kb_videos` | 115 | Video metadata |
| `video_steps` | 6,322 | Transcribed steps with embeddings |
| `app_pages` | 0 | **Fresh** - ready for KB-guided crawl |
| `page_containers` | 0 | **Fresh** - modals, drawers, dropdowns |
| `global_navigation` | 0 | **Fresh** - nav structure |
| `nav_items` | 0 | **Fresh** - nav links |

### Archived Tables (Preserved Data)

| Table | Rows | Description |
|-------|------|-------------|
| `_archived_app_pages` | 156 | Old app pages (before KB-guided) |
| `_archived_page_elements` | 1,205 | Old element data |
| `_archived_global_nav_items` | 236 | Old navigation items |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+ 
- Chrome browser (for authenticated scraping)
- Supabase account (configured)
- OpenAI API key (for embeddings and descriptions)

### Installation

```bash
cd C:\Users\singe\lenny-bot

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
python -m pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Configure environment
# Copy env.example.txt to .env and fill in your credentials
```

### Using Lenny Bot (Q&A)

The RAG pipeline is ready! Ask Lenny questions about AccuLynx:

```bash
# Interactive chat mode (recommended)
bat\rag\ASK_LENNY.bat

# Or use Python directly:
python scripts/ask_lenny.py "How do I create a new job?"
python scripts/ask_lenny.py --search "reports"  # Search only, no LLM
```

### Running the Claude-as-Crawler

We use Claude in Cursor as an intelligent crawler (no Python code needed):

```bash
# Step 1: Start Chrome with debug port
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"

# Step 2: In Chrome, navigate to AccuLynx and log in

# Step 3: In Cursor, tell Claude:
"The browser is ready on Job Overview. Let's start crawling."
```

Claude will:
- Take browser snapshots to discover elements
- Intelligently classify what to explore vs document
- Click through tabs and actions
- Save findings to the database
- Ask for guidance when uncertain

See `docs/AI_CRAWLER_APPROACH.md` for full details.

### Database Management

```bash
# Run migrations
bat\database\RUN_MIGRATIONS.bat

# Generate embeddings for new content
bat\rag\GENERATE_EMBEDDINGS.bat
```

### Processing KB Videos

KB articles often contain training videos. Extract their content for RAG:

```bash
# Prerequisites: Install yt-dlp and ffmpeg
pip install yt-dlp
# Download ffmpeg from https://ffmpeg.org/download.html

# Discover videos in KB articles (re-scrape KB)
bat\scrapers\RUN_KB_SCRAPER.bat

# Process discovered videos (transcribe + analyze)
bat\scrapers\PROCESS_KB_VIDEOS.bat
```

---

## 📁 Project Structure

```
lenny-bot/
├── _archived/                    # Old files (preserved for reference)
│   ├── crawl_data/              # Old JSONs, logs, sitemaps
│   ├── screenshots/             # Old screenshot directories
│   ├── scripts/                 # Old test/debug scripts
│   └── scrapers/                # Deprecated scrapers (action_explorer, etc.)
│
├── config/
│   ├── settings.py              # Environment configuration
│   ├── product_areas.py         # AccuLynx product taxonomy
│   ├── noise_patterns.py        # Content filtering rules
│   ├── page_templates.py        # UI template patterns
│   └── navigation_structure.py  # Header navigation config
│
├── database/
│   ├── supabase_client.py       # Supabase connection
│   ├── models.py                # Pydantic data models (KB)
│   ├── app_models.py            # Pydantic data models (App)
│   └── migrations/              # SQL schema files (001-019)
│
├── scrapers/
│   ├── kb_scraper.py            # Knowledge Base scraper ✓
│   ├── kb_guided_crawler/       # Utilities for Claude-as-Crawler
│   │   ├── __init__.py          # Module exports
│   │   ├── url_normalizer.py    # URL → pattern conversion
│   │   ├── kb_context.py        # KB semantic search context
│   │   ├── page_describer.py    # GPT-4o descriptions (when needed)
│   │   └── screenshot_manager.py # Local screenshot storage
│   ├── _archive_python_crawler/ # Archived Python crawler code
│   ├── browser_auth.py          # Multi-strategy browser auth
│   └── base_scraper.py          # Abstract scraper base class
│
├── processors/
│   ├── video_processor.py       # Video transcription & analysis ✓
│   ├── content_classifier.py    # GPT-4o-mini classification
│   ├── embedder.py              # OpenAI embeddings
│   └── chunker.py               # Intelligent content chunking
│
├── rag/                          # RAG Pipeline ✓
│   ├── llm_provider.py          # Swappable LLM backends
│   ├── embeddings.py            # Generate vector embeddings
│   ├── search.py                # Semantic similarity search
│   └── qa_chain.py              # Q&A chain (search → LLM → answer)
│
├── scripts/
│   ├── ask_lenny.py             # Interactive Q&A CLI ✓
│   ├── generate_embeddings.py   # Generate embeddings ✓
│   ├── scrape_kb.py             # Run KB scraper
│   ├── process_kb_videos.py     # Process videos
│   ├── cleanup_project.py       # Project cleanup utility
│   └── run_migrations.py        # Run database migrations
│
├── bat/                         # Batch scripts
│   ├── rag/                     # RAG commands
│   ├── scrapers/                # Scraper commands
│   └── database/                # DB commands
│
├── admin/                       # Admin UI (React + Vite)
│   ├── src/
│   │   ├── pages/DesignSystem.tsx  # Design system showcase
│   │   └── index.css               # AccuLynx styles
│   ├── tailwind.config.js          # AccuLynx theme
│   └── package.json
│
├── docs/
│   ├── AI_CRAWLER_APPROACH.md  # Claude-as-Crawler methodology
│   ├── GLOBAL_CONTEXT.md           # AccuLynx product context
│   └── EPIC_KB_GUIDED_CRAWLING.md  # Epic documentation
│
├── video_processing/            # Video output (audio, frames)
├── venv/                        # Python virtual environment
│
├── README.md                    # This file
├── REFACTORING_PLAN.md          # Migration plan with phases
├── DEPRECATED.md                # Deprecated components reference
└── PROGRESS.md                  # Development history
```

---

## 🧠 Data Collection Philosophy

### Q&A Agent Approach (Current)

The Q&A agent needs to understand AccuLynx well enough to answer questions. This requires:

```
┌─────────────────────────────────────────────────────────────┐
│                    Q&A AGENT DATA MODEL                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. KB ARTICLES + VIDEOS (COMPLETE ✓)                        │
│     "How do you perform each task?"                          │
│     ─────────────────────────────                            │
│     • 297 help articles with embeddings                      │
│     • 115 training videos transcribed                        │
│     • 6,322 step-by-step instructions                        │
│                                                              │
│  2. PAGE SCREENSHOTS + DESCRIPTIONS (NEXT)                   │
│     "What does each screen look like?"                       │
│     ─────────────────────────────────                        │
│     • Screenshot of every page                               │
│     • AI description WITH KB context                         │
│     • Page type (dashboard, list, form, settings)            │
│                                                              │
│  3. CONTAINER SCREENSHOTS + DESCRIPTIONS                     │
│     "What do modals and drawers contain?"                    │
│     ─────────────────────────────────────                    │
│     • Screenshot of every modal, drawer, dropdown            │
│     • AI description WITH KB context                         │
│     • What button/link opens each container                  │
│                                                              │
│  4. NAVIGATION STRUCTURE                                     │
│     "How do you get to each page?"                           │
│     ───────────────────────────────                          │
│     • Complete menu structure                                │
│     • Links between pages                                    │
│     • Menu screenshots                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables (.env)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for full access |
| `DATABASE_URL` | PostgreSQL connection string (pooler) |
| `OPENAI_API_KEY` | For GPT-4o + text-embedding-3-large |
| `CHROME_DEBUG_PORT` | Port for browser connection (default: 9222) |

### Key URLs

- **AccuLynx KB**: https://support.acculynx.com/hc/en-us
- **AccuLynx App (Staging)**: https://stage-my.acculynx.com/dashboard

---

## 📈 Metrics

### KB Coverage

| Metric | Count |
|--------|-------|
| **KB Articles** | 297 |
| **KB Videos** | 115 |
| **Video Steps** | 6,322 |
| **Content Chunks** | 150 |

### Cost Estimates

| Component | Monthly Cost |
|-----------|--------------|
| Supabase | Free tier |
| OpenAI Embeddings | ~$5-10 |
| GPT-4o (descriptions) | ~$10-20 |
| RunPod (70B model) | ~$200-400 |
| **Total** | **~$220-430** |

---

## 📚 Related Documents

### Crawler Documentation
- `docs/AI_AGENT_QUICKSTART.md` - **Start here** for new Claude agents
- `docs/AI_CRAWLER_APPROACH.md` - Full methodology and protocols
- `docs/GLOBAL_CONTEXT.md` - AccuLynx product overview
- `docs/EPIC_KB_GUIDED_CRAWLING.md` - Epic documentation

### Project History  
- `REFACTORING_PLAN.md` - Detailed migration plan with phases
- `DEPRECATED.md` - Deprecated components (preserved for future Action Agent)
- `PROGRESS.md` - Historical development log

---

## 📝 License

Private - Internal Use Only
