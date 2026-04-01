import React, { useState, useEffect } from 'react';

/**
 * FilterBar — reusable horizontal filter strip used by Students, AlumniDirectory, Network.
 * Props:
 *   accentColor    : string
 *   scope          : 'my_college' | 'all_colleges'
 *   onScopeChange  : fn(scope)
 *   filterOpts     : { batches:[], departments:[], courses:[] }
 *   activeParams   : { batch, department, course, sort, searchField, searchQuery }
 *   onFilterChange : fn(changes) — fires on every dropdown change
 *   onSearch       : fn({ searchField, searchQuery })
 *   sortOptions    : [{ value, label }]
 *   showSearch     : bool (default true)
 *   showScope      : bool (default true)
 *   searchFields   : [{ value, label }]
 */
export default function FilterBar({
  accentColor = '#7C3AED',
  scope = 'my_college',
  onScopeChange,
  filterOpts = { batches: [], departments: [], courses: [] },
  activeParams = {},
  onFilterChange,
  onSearch,
  sortOptions,
  showSearch = true,
  showScope = true,
  searchFields,
}) {
  const DEFAULT_SORT = sortOptions || [
    { value: '',               label: 'Sort By'        },
    { value: 'latest',        label: 'Latest'          },
    { value: 'oldest',        label: 'Oldest'          },
    { value: 'most_connected', label: 'Most Connected' },
  ];

  const DEFAULT_SEARCH_FIELDS = searchFields || [
    { value: 'all',        label: 'All'     },
    { value: 'name',       label: 'Name'    },
    { value: 'batch',      label: 'Batch'   },
    { value: 'department', label: 'Dept'    },
    { value: 'skills',     label: 'Skills'  },
    { value: 'company',    label: 'Company' },
  ];

  const [batch,       setBatch]       = useState(activeParams.batch       || '');
  const [department,  setDepartment]  = useState(activeParams.department  || '');
  const [course,      setCourse]      = useState(activeParams.course      || '');
  const [sort,        setSort]        = useState(activeParams.sort        || '');
  const [searchField, setSearchField] = useState(activeParams.searchField || 'all');
  const [searchQuery, setSearchQuery] = useState(activeParams.searchQuery || '');

  useEffect(() => {
    setBatch(      activeParams.batch       || '');
    setDepartment( activeParams.department  || '');
    setCourse(     activeParams.course      || '');
    setSort(       activeParams.sort        || '');
    setSearchField(activeParams.searchField || 'all');
    setSearchQuery(activeParams.searchQuery || '');
  }, [
    activeParams.batch, activeParams.department, activeParams.course,
    activeParams.sort,  activeParams.searchField, activeParams.searchQuery,
  ]);

  const fire = changes => onFilterChange && onFilterChange(changes);

  const handleBatch  = v => { setBatch(v);      fire({ batch: v }); };
  const handleDept   = v => { setDepartment(v); fire({ department: v }); };
  const handleCourse = v => { setCourse(v);     fire({ course: v }); };
  const handleSort   = v => { setSort(v);       fire({ sort: v }); };

  const goSearch = () => onSearch && onSearch({ searchField, searchQuery });

  const clearAll = () => {
    setBatch(''); setDepartment(''); setCourse(''); setSort(''); setSearchQuery('');
    fire({ batch: '', department: '', course: '', sort: '' });
    onSearch && onSearch({ searchField: 'all', searchQuery: '' });
  };

  const activeCount = [batch, department, course, sort].filter(Boolean).length;

  const selStyle = (active) => ({
    border: `1.5px solid ${active ? accentColor : '#E5E7EB'}`,
    borderRadius: 8,
    padding: '8px 28px 8px 10px',
    fontSize: 12.5,
    color: active ? accentColor : '#374151',
    background: active ? `${accentColor}0d` : '#fff',
    fontWeight: active ? 700 : 400,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    transition: 'all 0.12s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  });

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #E5E7EB',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>

      {/* Row 1: Scope toggle + filter dropdowns */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

        {showScope && onScopeChange && (
          <div style={{
            display: 'inline-flex',
            borderRadius: 9,
            border: `1.5px solid ${accentColor}35`,
            overflow: 'hidden',
            background: '#F9FAFB',
            flexShrink: 0,
          }}>
            {[
              { value: 'my_college',   label: 'My College'   },
              { value: 'all_colleges', label: 'All Colleges' },
            ].map(opt => (
              <button key={opt.value} onClick={() => onScopeChange(opt.value)} style={{
                padding: '7px 14px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 700,
                transition: 'all 0.15s',
                background: scope === opt.value ? accentColor : 'transparent',
                color: scope === opt.value ? '#fff' : '#6B7280',
                whiteSpace: 'nowrap',
              }}>
                {opt.value === 'my_college'
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5, verticalAlign: 'middle' }}><path d="M3 9L12 4L21 9V11H3V9Z"/><path d="M5 11V18H19V11"/></svg>
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5, verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                }
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Batch */}
        <select value={batch} onChange={e => handleBatch(e.target.value)} style={selStyle(!!batch)}>
          <option value="">All Batches</option>
          {(filterOpts.batches || []).map(b => <option key={b} value={b}>Batch {b}</option>)}
        </select>

        {/* Course/Degree */}
        {(filterOpts.courses || []).length > 0 && (
          <select value={course} onChange={e => handleCourse(e.target.value)} style={selStyle(!!course)}>
            <option value="">All Courses</option>
            {(filterOpts.courses || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Department */}
        <select value={department} onChange={e => handleDept(e.target.value)} style={selStyle(!!department)}>
          <option value="">All Depts</option>
          {(filterOpts.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Sort By */}
        <select value={sort} onChange={e => handleSort(e.target.value)} style={selStyle(!!sort)}>
          {DEFAULT_SORT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Clear active filters */}
        {activeCount > 0 && (
          <button onClick={clearAll} style={{
            padding: '7px 12px',
            border: '1.5px solid #FCA5A5',
            borderRadius: 8,
            background: '#FEF2F2',
            color: '#EF4444',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Clear ({activeCount})
          </button>
        )}
      </div>

      {/* Row 2: Search bar */}
      {showSearch && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={searchField} onChange={e => setSearchField(e.target.value)}
            style={{ ...selStyle(false), minWidth: 80, flex: '0 0 auto' }}>
            {DEFAULT_SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goSearch()}
              placeholder={`Search by ${searchField === 'all' ? 'name, batch, dept, skills…' : searchField}`}
              style={{
                border: '1.5px solid #E5E7EB',
                borderRadius: 8,
                padding: `8px ${searchQuery ? 28 : 12}px 8px 30px`,
                fontSize: 13,
                color: '#374151',
                background: '#fff',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); onSearch && onSearch({ searchField, searchQuery: '' }); }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>

          <button onClick={goSearch} style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: accentColor,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            Search
          </button>
        </div>
      )}
    </div>
  );
}
