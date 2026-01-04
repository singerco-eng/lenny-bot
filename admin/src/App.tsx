import { Link } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-al-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Lenny Bot Admin</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-semibold text-al-text-primary mb-8">
          Welcome to Lenny Bot Admin
        </h1>

        {/* Featured: Ask Lenny */}
        <Link to="/ask-lenny" className="block mb-8 group">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all border border-slate-700 hover:border-orange-500/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform overflow-hidden">
                <img src="/lenny.jpg" alt="Lenny" className="w-20 h-20 object-cover object-top scale-125" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  Ask Lenny
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">NEW</span>
                </h2>
                <p className="text-slate-400">
                  Chat with our AI assistant to find features, understand workflows, and get help
                </p>
              </div>
              <svg className="w-6 h-6 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/pages" className="al-card hover:shadow-lg transition-shadow">
            <div className="al-card-header">
              <svg className="w-5 h-5 text-al-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Pages
            </div>
            <p className="text-al-text-secondary text-sm">
              Browse crawled app pages and their components
            </p>
          </Link>

          <Link to="/sitemap" className="al-card hover:shadow-lg transition-shadow">
            <div className="al-card-header">
              <svg className="w-5 h-5 text-al-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Sitemap
            </div>
            <p className="text-al-text-secondary text-sm">
              Visual hierarchy of all crawled pages and components
            </p>
          </Link>

          <div className="al-card opacity-50">
            <div className="al-card-header">
              <svg className="w-5 h-5 text-al-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Product Areas
            </div>
            <p className="text-al-text-secondary text-sm">
              View KB-derived product areas and features
            </p>
          </div>

          <div className="al-card opacity-50">
            <div className="al-card-header">
              <svg className="w-5 h-5 text-al-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Review Queue
            </div>
            <p className="text-al-text-secondary text-sm">
              Review unknown items flagged by the crawler
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App



