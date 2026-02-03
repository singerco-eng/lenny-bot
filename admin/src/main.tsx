import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import DesignSystem from './pages/DesignSystem'
import PagesListPage from './pages/PagesListPage'
import PageDetailPage from './pages/PageDetailPage'
import SitemapPage from './pages/SitemapPage'
import AskLennyPage from './pages/AskLennyPage'
import ResearchListPage from './pages/ResearchListPage'
import ResearchDetailPage from './pages/ResearchDetailPage'
import ResearchSearchPage from './pages/ResearchSearchPage'
import ResearchReviewPage from './pages/ResearchReviewPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/pages" element={<PagesListPage />} />
        <Route path="/pages/:pattern" element={<PageDetailPage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="/ask-lenny" element={<AskLennyPage />} />
        <Route path="/research" element={<ResearchListPage />} />
        <Route path="/research/search" element={<ResearchSearchPage />} />
        <Route path="/research/review" element={<ResearchReviewPage />} />
        <Route path="/research/:id" element={<ResearchDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)



