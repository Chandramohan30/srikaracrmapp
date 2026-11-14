import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, Inbox } from 'lucide-react';

/**
 * One table used by every list page (Students, Courses, Trainers, Departments, Payments, Installments …)
 *  - global search, click-to-sort headers, pagination with page size, CSV export
 *  - optional filters (toolbar), primary button (actions), row click, per-row action buttons
 */
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** value used for sorting; defaults to (row as any)[key] */
  sortValue?: (row: T) => string | number | null | undefined;
  /** value used for CSV export; defaults to sortValue */
  exportValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  title?: string;
  subtitle?: React.ReactNode;
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** text searched by the search box */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  rowClassName?: (row: T) => string;
  emptyText?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  exportFileName?: string;
  /** extra rows rendered right under a row (e.g. sub-installments) */
  renderSubRows?: (row: T) => React.ReactNode;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable<T>({
  title,
  subtitle,
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = 'Search…',
  toolbar,
  actions,
  onRowClick,
  rowActions,
  rowClassName,
  emptyText = 'No records found.',
  initialSort,
  pageSize: initialPageSize = 10,
  exportFileName,
  renderSubRows
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort || null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const valueOf = (col: Column<T>, row: T) =>
    col.sortValue ? col.sortValue(row) : (row as any)[col.key];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const text = searchText
        ? searchText(r)
        : columns.map(c => String(valueOf(c, r) ?? '')).join(' ');
      return text.toLowerCase().includes(q);
    });
  }, [rows, query, searchText, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = valueOf(col, a);
      const vb = valueOf(col, b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'en', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { setPage(1); }, [query, pageSize, rows.length]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const exportCsv = () => {
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cols = columns.filter(c => c.key !== '__actions');
    const lines = [
      cols.map(c => esc(c.header)).join(','),
      ...sorted.map(r => cols.map(c => esc(c.exportValue ? c.exportValue(r) : valueOf(c, r))).join(','))
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const colCount = columns.length + (rowActions ? 1 : 0);

  // compact page list: 1 … 4 5 6 … 12
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* header */}
      {(title || actions) && (
        <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
          
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* toolbar */}
      <div className="px-4 sm:px-5 pb-3 flex flex-col lg:flex-row lg:items-center gap-2 border-b border-slate-200">
        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-8 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
            aria-label="Search table"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2 text-xs">{toolbar}</div>}
        <button
          onClick={exportCsv}
          disabled={sorted.length === 0}
          className="lg:ml-auto shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
          title="Download the filtered rows as CSV (opens in Excel)"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
            <tr>
              {columns.map(col => {
                const sortable = col.sortable !== false;
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-3.5 py-3 font-semibold border-b border-slate-200 ${alignCls(col.align)} ${col.headerClassName || ''}`}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800 ${active ? 'text-blue-700' : ''} ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th className="sticky right-0 z-[1] bg-slate-50 px-3.5 py-3 font-semibold border-b border-slate-200 text-right shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)]">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-14 text-center text-slate-400">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  {query ? `No records match “${query}”.` : emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map(row => (
                <React.Fragment key={getRowId(row)}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`group border-b border-slate-100 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-blue-50/60' : 'hover:bg-slate-50'} ${rowClassName ? rowClassName(row) : ''}`}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={`px-3.5 py-3 text-slate-700 ${alignCls(col.align)} ${col.className || ''}`}>
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                      </td>
                    ))}
                    {rowActions && (
                      <td
                        className={`sticky right-0 bg-white px-3.5 py-2 text-right shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)] ${onRowClick ? 'group-hover:bg-blue-50' : 'group-hover:bg-slate-50'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                  {renderSubRows && renderSubRows(row)}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span>
            Showing <b className="text-slate-700">{sorted.length === 0 ? 0 : start + 1}</b>–<b className="text-slate-700">{Math.min(start + pageSize, sorted.length)}</b> of{' '}
            <b className="text-slate-700">{sorted.length}</b>
            {sorted.length !== rows.length && <> (filtered from {rows.length})</>}
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-7 px-1.5 border border-slate-300 rounded-md bg-white text-slate-700"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-7 min-w-7 px-2 rounded-md border text-[11px] font-semibold ${
                  p === page ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- small shared bits for list pages ---- */

export const filterSelectCls =
  'h-9 max-w-[180px] px-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600';

export const IconAction: React.FC<{
  title: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}> = ({ title, onClick, tone = 'default', children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors ${
      tone === 'danger'
        ? 'border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
        : 'border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50'
    }`}
  >
    {children}
  </button>
);

export const PrimaryButton: React.FC<{ onClick: () => void; children: React.ReactNode; icon?: React.ReactNode }> = ({ onClick, children, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
  >
    {icon}
    {children}
  </button>
);

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
      active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

/** Number that opens a related, filtered list (e.g. a department's students) */
export const CountLink: React.FC<{ count: number; onClick: () => void; title: string }> = ({ count, onClick, title }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={title}
    className="min-w-8 h-7 px-2 inline-flex items-center justify-center rounded-md bg-blue-50 text-blue-700 font-semibold tabular-nums hover:bg-blue-100"
  >
    {count}
  </button>
);
