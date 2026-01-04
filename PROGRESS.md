# 📋 Lenny Bot - Development Progress

## Session 1: December 10, 2025

### 🎯 Goals
- Plan the Lenny Bot project architecture
- Set up initial project structure
- Configure Supabase database
- Build scraping infrastructure

### ✅ Completed

#### 1. Project Planning & Architecture
- Defined 3-phase development roadmap:
  1. Data Collection (KB + App scraping)
  2. Agent Development (RunPod + self-hosted LLM)
  3. Admin Interface (Next.js + Vercel)
- Chose technology stack:
  - **Database**: Supabase (PostgreSQL + pgvector)
  - **Embeddings**: OpenAI text-embedding-3-large (3072 dims)
  - **Vision/Classification**: GPT-4o-mini
  - **LLM**: Self-hosted on RunPod (Llama 3.1 or Qwen)

#### 2. Project Structure Created
```
lenny-bot/
├── config/           # Settings, taxonomy, noise patterns
├── database/         # Supabase client, models, migrations
├── scrapers/         # Browser auth, base scraper, KB scraper
├── processors/       # Classifier, embedder, chunker
└── scripts/          # CLI utilities
```

#### 3. Product Area Taxonomy
Defined 10 main product areas with 30+ sub-categories:
- CRM & Contacts (Lead Management, Customer Records, Communication)
- Jobs & Projects (Job Creation, Workflow, Details)
- Estimating & Proposals (Measurements, Materials, Proposals)
- Scheduling & Calendar (Crew Scheduling, Appointments, Calendar)
- Financials (Invoicing, Payments, QuickBooks)
- Reports & Analytics (Sales, Production, Custom Reports)
- Mobile App (iOS, Android, Field Features)
- Integrations (EagleView, CompanyCam, Others)
- Settings & Admin (Users, Permissions, Company Settings)
- Getting Started (Onboarding, Best Practices, FAQs)

#### 4. Database Schema
Created SQL migrations with:
- `product_areas` - Hierarchical taxonomy
- `source_urls` - URLs to scrape/scraped
- `content_chunks` - Processed content
- `embeddings` - Vector embeddings (3072 dimensions)
- `scrape_sessions` - Tracking for scrape runs
- `search_similar_content()` - Vector similarity function

#### 5. Supabase Configuration
- Project created: `nawkiifscbhwaaksghfr`
- Region: `us-west-2`
- Connection verified: PostgreSQL 17.6
- Pooler URL: `aws-0-us-west-2.pooler.supabase.com`

#### 6. Scraper Infrastructure
- **BrowserAuth**: Multi-strategy authentication
  - Persistent browser profile
  - Chrome DevTools Protocol (CDP)
  - Manual login fallback
- **BaseScraper**: Session tracking, URL management, content saving
- **KnowledgeBaseScraper**: Zendesk-specific scraper with:
  - URL discovery (BFS traversal)
  - HTML cleaning and markdown conversion
  - Breadcrumb/hierarchy extraction
  - Quality scoring
  - Screenshot capture

#### 7. Content Processing Pipeline
- **ContentClassifier**: GPT-4o-mini for product area classification
- **Embedder**: OpenAI text-embedding-3-large batch processing
- **ContentChunker**: Token-aware splitting with overlap

### 📝 Configuration Files
- `.env` - Contains all API keys and connection strings
- `.gitignore` - Protects secrets and temp files
- `requirements.txt` - Python dependencies

### 🔑 Key Decisions Made
| Decision | Choice | Reason |
|----------|--------|--------|
| Embedding Model | text-embedding-3-large | Best quality, reasonable cost |
| Vision Model | GPT-4o-mini | Cost-effective for screenshots |
| Database | Supabase | Free tier, pgvector, simple |
| Browser Auth | Persistent profile + CDP | Handles SSO/2FA |
| Agent Hosting | RunPod | Self-hosted = lower ongoing costs |

### ⏭️ Next Steps
1. **Run database migrations** - Create tables in Supabase
2. **Test KB scraper** - Scrape AccuLynx knowledge base
3. **Process content** - Classify and embed scraped data
4. **Build app scraper** - Capture authenticated app pages
5. **Start admin UI** - Next.js dashboard

### 🐛 Issues Encountered
- Initial DB connection used wrong hostname format
  - ❌ `db.xxx.supabase.co` (old format)
  - ✅ `aws-0-us-west-2.pooler.supabase.com` (correct)
- Python not in PATH on Windows - resolved with Microsoft Store install

### 📊 Metrics
- Files created: ~25
- Lines of code: ~2000+
- Tables designed: 5
- Product areas: 10 (30+ sub-areas)

---

## Upcoming Sessions

### Session 2 (Planned)
- [ ] Run migrations to create tables
- [ ] Populate product areas
- [ ] Execute KB scraper
- [ ] Review scraped data quality

### Session 3 (Planned)
- [ ] Build app page scraper
- [ ] Screenshot capture + GPT Vision parsing
- [ ] Content enrichment

### Session 4 (Planned)
- [ ] RunPod setup
- [ ] LLM deployment
- [ ] RAG pipeline

### Session 5 (Planned)
- [ ] Next.js admin panel
- [ ] Vercel deployment
- [ ] End-to-end testing

