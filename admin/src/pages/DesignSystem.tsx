import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function DesignSystem() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [radioValue, setRadioValue] = useState('option1')

  return (
    <div className="min-h-screen bg-al-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Design System</span>
        </div>
        <Link to="/" className="text-white/80 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-semibold text-al-text-primary mb-2">
          AccuLynx Design System
        </h1>
        <p className="text-al-text-secondary mb-8">
          Component library styled to match AccuLynx for the Lenny Bot Admin UI
        </p>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <ColorSwatch name="Navy" color="bg-al-navy" hex="#1E3A5F" />
            <ColorSwatch name="Navy Dark" color="bg-al-navy-dark" hex="#162D4A" />
            <ColorSwatch name="Orange" color="bg-al-orange" hex="#f5853b" />
            <ColorSwatch name="Blue (Primary)" color="bg-al-blue" hex="#4781bf" />
            <ColorSwatch name="Success" color="bg-al-success" hex="#48BB78" />
            <ColorSwatch name="Error" color="bg-al-error" hex="#E53E3E" />
            <ColorSwatch name="Background" color="bg-al-bg" hex="#F5F7FA" border />
            <ColorSwatch name="Surface" color="bg-al-surface" hex="#FFFFFF" border />
            <ColorSwatch name="Border" color="bg-al-border" hex="#E2E8F0" border />
            <ColorSwatch name="Text Primary" color="bg-al-text-primary" hex="#2D3748" />
            <ColorSwatch name="Text Secondary" color="bg-al-text-secondary" hex="#718096" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-al-text-secondary mb-1">text-2xl (24px)</p>
              <p className="text-2xl text-al-text-primary">Drawer Title / Page Header</p>
            </div>
            <div>
              <p className="text-xs text-al-text-secondary mb-1">text-xl (20px)</p>
              <p className="text-xl text-al-text-primary">Section Title</p>
            </div>
            <div>
              <p className="text-xs text-al-text-secondary mb-1">text-base (16px) font-semibold</p>
              <p className="text-base font-semibold text-al-text-primary">Card Header</p>
            </div>
            <div>
              <p className="text-xs text-al-text-secondary mb-1">text-sm (14px)</p>
              <p className="text-sm text-al-text-primary">Body text and form inputs</p>
            </div>
            <div>
              <p className="text-xs text-al-text-secondary mb-1">al-label (uppercase)</p>
              <p className="al-label">Form Label / Metadata</p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap gap-4 items-center">
            <button className="al-btn-primary">Primary (Blue)</button>
            <button className="al-btn-primary" disabled>Primary Disabled</button>
            <button className="al-btn-secondary">Secondary (Orange)</button>
            <button className="al-btn-outline">Outline Blue</button>
            <button className="al-btn-outline-orange">Outline Orange</button>
            <button className="al-btn-text">Text Button</button>
          </div>
          
          <div className="mt-6">
            <p className="al-label mb-3">Button with Icon</p>
            <div className="flex gap-4">
              <button className="al-btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Appointment
              </button>
              <button className="al-btn-outline-orange flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Map Assign
              </button>
            </div>
          </div>
        </Section>

        {/* Form Inputs */}
        <Section title="Form Inputs">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="al-label">Default Input</label>
              <input type="text" className="al-input" placeholder="Enter text..." />
            </div>
            <div>
              <label className="al-label">Required Input *</label>
              <input type="text" className="al-input-required" placeholder="Required field" />
            </div>
            <div>
              <label className="al-label">Error State</label>
              <input type="text" className="al-input-error" defaultValue="Invalid value" />
              <p className="text-al-error text-xs mt-1">This field has an error</p>
            </div>
            <div>
              <label className="al-label">Select Dropdown</label>
              <select className="al-select">
                <option>Select an option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label className="al-label">Textarea</label>
              <textarea className="al-input h-24" placeholder="Enter notes..." />
              <p className="text-al-text-muted text-xs text-right mt-1">1000/1000</p>
            </div>
            <div>
              <label className="al-label">Search Input</label>
              <div className="relative">
                <input type="text" className="al-input pr-10" placeholder="Search..." />
                <svg className="w-5 h-5 text-al-text-muted absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Checkboxes and Radios */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div>
              <p className="al-label mb-3">Checkboxes</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={checkboxChecked}
                    onChange={(e) => setCheckboxChecked(e.target.checked)}
                    className="al-checkbox"
                  />
                  <span className="text-sm text-al-text-primary">Opt in to Texting/SMS</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked
                    className="al-checkbox"
                  />
                  <span className="text-sm text-al-text-primary">All Day Event</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer opacity-50">
                  <input 
                    type="checkbox" 
                    disabled
                    className="al-checkbox"
                  />
                  <span className="text-sm text-al-text-primary">Disabled Checkbox</span>
                </label>
              </div>
            </div>
            <div>
              <p className="al-label mb-3">Radio Buttons</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="priority"
                    value="option1"
                    checked={radioValue === 'option1'}
                    onChange={(e) => setRadioValue(e.target.value)}
                    className="al-radio"
                  />
                  <span className="text-sm text-al-text-primary">Primary</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="priority"
                    value="option2"
                    checked={radioValue === 'option2'}
                    onChange={(e) => setRadioValue(e.target.value)}
                    className="al-radio"
                  />
                  <span className="text-sm text-al-text-primary">Secondary</span>
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="al-card">
              <div className="al-card-header">
                <svg className="w-5 h-5 text-al-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Primary Contact
              </div>
              <p className="text-sm text-al-text-secondary">
                Card body content goes here. This is styled like AccuLynx's information cards.
              </p>
            </div>
            <div className="al-card">
              <div className="al-card-header">
                <svg className="w-5 h-5 text-al-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Notes / Tools
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-al-text-secondary">Lead Rank:</span>
                  <span className="text-al-text-muted">Unavailable</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-al-text-secondary">Priority Level:</span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-al-success"></span>
                    Normal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges / Status Pills">
          <div className="flex flex-wrap gap-3">
            <span className="al-badge-green">Completed</span>
            <span className="al-badge-orange">Pending</span>
            <span className="al-badge-blue">In Progress</span>
            <span className="al-badge bg-purple-100 text-purple-800">Custom</span>
            <span className="al-badge bg-gray-100 text-gray-800">Inactive</span>
          </div>
        </Section>

        {/* Section Divider */}
        <Section title="Section Divider">
          <p className="text-sm text-al-text-secondary mb-4">
            Used between form sections in AccuLynx
          </p>
          <div className="al-divider"></div>
          <p className="text-sm text-al-text-secondary mt-4">
            Content after divider
          </p>
        </Section>

        {/* Drawer Demo */}
        <Section title="Drawer / Slideout">
          <p className="text-sm text-al-text-secondary mb-4">
            AccuLynx's signature right-panel drawer for forms and details
          </p>
          <button 
            className="al-btn-primary"
            onClick={() => setDrawerOpen(true)}
          >
            Open Drawer
          </button>
        </Section>

        {/* Table Preview */}
        <Section title="Data Table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-al-bg">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">Product Area</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-al-bg">
                  <td className="px-4 py-3 text-sm border-b border-al-border-light">Create Appointment</td>
                  <td className="px-4 py-3 border-b border-al-border-light"><span className="al-badge-green">Documented</span></td>
                  <td className="px-4 py-3 text-sm text-al-text-secondary border-b border-al-border-light">Calendar</td>
                  <td className="px-4 py-3 border-b border-al-border-light">
                    <button className="al-btn-text text-sm">View</button>
                  </td>
                </tr>
                <tr className="hover:bg-al-bg">
                  <td className="px-4 py-3 text-sm border-b border-al-border-light">Create Lead</td>
                  <td className="px-4 py-3 border-b border-al-border-light"><span className="al-badge-orange">Pending Review</span></td>
                  <td className="px-4 py-3 text-sm text-al-text-secondary border-b border-al-border-light">Leads</td>
                  <td className="px-4 py-3 border-b border-al-border-light">
                    <button className="al-btn-text text-sm">View</button>
                  </td>
                </tr>
                <tr className="hover:bg-al-bg">
                  <td className="px-4 py-3 text-sm border-b border-al-border-light">Unknown Widget</td>
                  <td className="px-4 py-3 border-b border-al-border-light"><span className="al-badge bg-red-100 text-red-800">Unknown</span></td>
                  <td className="px-4 py-3 text-sm text-al-text-secondary border-b border-al-border-light">—</td>
                  <td className="px-4 py-3 border-b border-al-border-light">
                    <button className="al-btn-text text-sm">Classify</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </main>

      {/* Drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="al-drawer translate-x-0">
            <div className="al-drawer-header">
              <h2 className="al-drawer-title">Appointment Details</h2>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-al-text-secondary hover:text-al-text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="al-drawer-body">
              <div className="space-y-4">
                <div>
                  <label className="al-label">Title *</label>
                  <input type="text" className="al-input-required" placeholder="Title" />
                </div>
                <div>
                  <label className="al-label">Attendees</label>
                  <select className="al-select">
                    <option>Select multiple attendees...</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="al-label">Start Date *</label>
                    <input type="text" className="al-input" defaultValue="12/22/2025" />
                  </div>
                  <div>
                    <label className="al-label">Start Time</label>
                    <input type="text" className="al-input" defaultValue="11:30 AM" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="al-checkbox" />
                    <span className="text-sm">All Day</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="al-checkbox" />
                    <span className="text-sm">Recurring</span>
                  </label>
                </div>
                <div>
                  <label className="al-label">Details</label>
                  <textarea className="al-input h-24" placeholder="Enter details..." />
                </div>
              </div>
            </div>
            <div className="al-drawer-footer">
              <button 
                className="al-btn-text"
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </button>
              <button className="al-btn-primary" disabled>
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-al-text-primary mb-4 pb-2 border-b border-al-border">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ColorSwatch({ name, color, hex, border }: { name: string; color: string; hex: string; border?: boolean }) {
  return (
    <div className="text-center">
      <div className={`w-full h-16 rounded-lg ${color} ${border ? 'border border-al-border' : ''} mb-2`} />
      <p className="text-sm font-medium text-al-text-primary">{name}</p>
      <p className="text-xs text-al-text-secondary">{hex}</p>
    </div>
  )
}

