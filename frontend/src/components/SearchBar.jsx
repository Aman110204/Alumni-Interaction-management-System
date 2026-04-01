/**
 * SearchBar.jsx
 * Shared search component used across Alumni Directory, Network pages, ManageAlumni, etc.
 *
 * Layout:
 *   [Dropdown: All ▼] [Search Input ..................] [Search] [All Filters]
 *   [Saved Searches dropdown below input]
 *
 * All Filters panel: Batch, Department, Company, Skills (NO college filter here)
 * College filter is handled separately at page level (My College / All Colleges)
 */
import React, { useState, useRef, useEffect } from 'react';

const SEARCH_FIELDS = [
  { value: 'all',        label: 'All' },
  { value: 'name',       label: 'Name' },
  { value: 'email',      label: 'Email' },
  { value: 'skills',     label: 'Skills' },
  { value: 'company',    label: 'Company' },
  { value: 'department', label: 'Department' },
  { value: 'batch',      label: 'Batch' },
];

const SAVED_SEARCHES = [
  {
    id: 1,
    label: 'Software Engineers – Batch 2022',
    filters: { searchField: 'all', searchQuery: 'software engineer', batch: '2022', department: '', company: '', skills: '' },
  },
  {
    id: 2,
    label: 'Alumni at Google / Microsoft',
    filters: { searchField: 'company', searchQuery: 'google', batch: '', department: '', company: 'Google', skills: '' },
  },
  {
    id: 3,
    label: 'ML / AI Skills – CSE Dept',
    filters: { searchField: 'skills', searchQuery: 'machine learning', batch: '', department: 'Computer Science (CSE)', company: '', skills: 'machine learning' },
  },
];

export default function SearchBar({
  accentColor = '#2563EB',
  filterOptions = { departments: [], companies: [], batches: [] },
  onSearch,         // fn({ searchField, searchQuery, batch, department, company, skills })
  initialValues = {},
}) {
  const [searchField,  setSearchField]  = useState(initialValues.searchField  || 'all');
  const [searchQuery,  setSearchQuery]  = useState(initialValues.searchQuery  || '');
  const [batch,        setBatch]        = useState(initialValues.batch        || '');
  const [department,   setDepartment]   = useState(initialValues.department   || '');
  const [company,      setCompany]      = useState(initialValues.company      || '');
  const [skills,       setSkills]       = useState(initialValues.skills       || '');
  const [showFilters,  setShowFilters]  = useState(false);
  const [showSaved,    setShowSaved]    = useState(false);
  const filtersRef = useRef();
  const savedRef   = useRef();

  // Close panels on outside click
  useEffect(() => {
    const h = e => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setShowFilters(false);
      if (savedRef.current   && !savedRef.current.contains(e.target))   setShowSaved(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const activeFilterCount = [batch, department, company, skills].filter(Boolean).length;

  const buildParams = (overrides = {}) => ({
    searchField, searchQuery, batch, department, company, skills, ...overrides,
  });

  const handleSearch = () => {
    if (onSearch) onSearch(buildParams());
    setShowSaved(false);
  };

  const handleKeyDown = e => { if (e.key === 'Enter') handleSearch(); };

  const applySaved = (saved) => {
    const f = saved.filters;
    setSearchField(f.searchField || 'all');
    setSearchQuery(f.searchQuery || '');
    setBatch(f.batch || '');
    setDepartment(f.department || '');
    setCompany(f.company || '');
    setSkills(f.skills || '');
    setShowSaved(false);
    if (onSearch) onSearch(f);
  };

  const clearAll = () => {
    setSearchQuery(''); setBatch(''); setDepartment(''); setCompany(''); setSkills('');
    if (onSearch) onSearch({ searchField, searchQuery: '', batch: '', department: '', company: '', skills: '' });
  };

  const inputStyle = {
    border: '1.5px solid #E5E7EB',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#374151',
    background: '#fff',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Main search row ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Field dropdown */}
        <select
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 110,
            cursor: 'pointer',
            paddingRight: 28,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          {SEARCH_FIELDS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }} ref={savedRef}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSaved(true)}
            placeholder={`Search by ${searchField === 'all' ? 'name, email, skills, company…' : searchField}`}
            style={{ ...inputStyle, paddingLeft: 32, paddingRight: searchQuery ? 28 : 12 }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); }} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}

          {/* Saved searches dropdown */}
          {showSaved && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{
                padding: '8px 14px 6px',
                fontSize: 11, fontWeight: 700, color: '#9CA3AF',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderBottom: '1px solid #F3F4F6',
              }}>
                Saved Searches
              </div>
              {SAVED_SEARCHES.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={e => { e.preventDefault(); applySaved(s); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 14px', border: 'none',
                    background: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: 13, color: '#374151',
                    borderBottom: i < SAVED_SEARCHES.length - 1 ? '1px dashed #F3F4F6' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: accentColor, color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Search
        </button>

        {/* All Filters button */}
        <div style={{ position: 'relative' }} ref={filtersRef}>
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${activeFilterCount ? accentColor : '#E5E7EB'}`,
              background: activeFilterCount ? accentColor + '10' : '#fff',
              color: activeFilterCount ? accentColor : '#374151',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            All Filters
            {activeFilterCount > 0 && (
              <span style={{
                background: accentColor, color: '#fff',
                borderRadius: 10, fontSize: 10, fontWeight: 700,
                padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>{activeFilterCount}</span>
            )}
          </button>

          {/* All Filters panel */}
          {showFilters && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: '#fff',
              border: '1.5px solid #E5E7EB', borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 300, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>All Filters</span>
                <button onClick={() => { clearAll(); setShowFilters(false); }} style={{
                  fontSize: 12, color: '#EF4444', background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 600,
                }}>Clear All</button>
              </div>

              {/* Batch */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                  Batch (Graduation Year)
                </label>
                <select value={batch} onChange={e => setBatch(e.target.value)} style={{ ...inputStyle }}>
                  <option value="">All Batches</option>
                  {filterOptions.batches && filterOptions.batches.map(b => (
                    <option key={b} value={b}>Class of {b}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                  Department
                </label>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={{ ...inputStyle }}>
                  <option value="">All Departments</option>
                  {filterOptions.departments && filterOptions.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                  Company
                </label>
                <select value={company} onChange={e => setCompany(e.target.value)} style={{ ...inputStyle }}>
                  <option value="">All Companies</option>
                  {filterOptions.companies && filterOptions.companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                  Skills
                </label>
                <input
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. React, Python, ML…"
                  style={inputStyle}
                />
              </div>

              <button
                onClick={() => { handleSearch(); setShowFilters(false); }}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  border: 'none', background: accentColor, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

