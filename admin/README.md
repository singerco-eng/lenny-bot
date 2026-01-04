# Lenny Bot Admin Interface

React admin panel for viewing and managing AccuLynx app documentation gathered by Lenny Bot crawlers.

## Features

- 📄 **Pages Browser** - View all crawled pages with actions and components
- 🗺️ **Sitemap Viewer** - Visual hierarchy of the app structure
- 💬 **Ask Lenny** - AI assistant for finding features and understanding workflows
- 🎨 **AccuLynx Design System** - Styled to match AccuLynx branding

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Supabase** - Database & API
- **React Router** - Navigation
- **React Flow** - Sitemap visualization

## Local Development

```bash
# From the admin directory
cd admin

# Install dependencies
npm install

# Create .env file with Supabase credentials
cat > .env << EOL
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOL

# Start dev server
npm run dev
```

Visit http://localhost:5173

## Vercel Deployment

### Required Environment Variables

Set these in Vercel Project Settings → Environment Variables:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase → Settings → API → anon public key |

### Automatic Configuration

The `vercel.json` in the repo root automatically configures:
- Build directory: `admin/`
- Output directory: `admin/dist`
- SPA routing (all routes → index.html)

Just push to GitHub and Vercel will handle the rest!

## Project Structure

```
admin/
├── src/
│   ├── pages/           # Page components
│   │   ├── PagesListPage.tsx
│   │   ├── PageDetailPage.tsx
│   │   ├── SitemapPage.tsx
│   │   └── AskLennyPage.tsx
│   ├── lib/
│   │   └── supabase.ts  # Supabase client & types
│   ├── App.tsx          # Home page
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind + custom styles
├── public/
│   └── lenny.jpg        # Lenny avatar
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Database Schema

The admin interface reads from these Supabase tables:
- `app_pages` - Crawled page metadata
- `page_actions` - Buttons, links, and interactive elements
- `page_components` - Modals, drawers, dropdowns
- `product_areas` - Feature groupings from knowledge base

See `database/migrations/` in the repo root for full schema.

