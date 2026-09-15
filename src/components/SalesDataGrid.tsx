import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ExternalLink,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SalesRecord, SpreadsheetDetails } from '../types';
import { formatCurrency } from '../utils/currency';

interface SalesDataGridProps {
  records: SalesRecord[];
  currentSpreadsheet: SpreadsheetDetails | null;
  sheetTitle: string;
}

export const SalesDataGrid: React.FC<SalesDataGridProps> = ({
  records,
  currentSpreadsheet,
  sheetTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof SalesRecord>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const categories = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.supplier.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;

        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [records, searchTerm, categoryFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginated = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Order ID', 'SKU', 'Product Name', 'Category', 'Units Sold', 'Unit Price', 'Revenue', 'Profit Margin %', 'Current Stock', 'Lead Time Days', 'Supplier'];
    const rows = filteredRecords.map(r => [
      r.date,
      r.orderId,
      r.sku,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.category,
      r.unitsSold,
      r.unitPrice,
      r.revenue,
      `${r.profitMarginPercent}%`,
      r.currentStock,
      r.leadTimeDays,
      `"${r.supplier.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_data_${sheetTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-300">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TableIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              Live Spreadsheet Records ({filteredRecords.length} of {records.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tab: <strong className="text-slate-700">&quot;{sheetTitle}&quot;</strong>
            {currentSpreadsheet && (
              <>
                {' '}&bull;{' '}
                <a
                  href={currentSpreadsheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                >
                  View in Google Sheets <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search SKU, product, order..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-52"
            />
          </div>

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
            title="Download records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th
                onClick={() => toggleSort('date')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Order ID</th>
              <th
                onClick={() => toggleSort('sku')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center gap-1">
                  <span>SKU &amp; Product</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Category</th>
              <th
                onClick={() => toggleSort('unitsSold')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Units</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('revenue')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Revenue</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('profitMarginPercent')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Margin</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('currentStock')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Stock</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Lead Time</th>
              <th className="py-3 px-4">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  No records found matching filters.
                </td>
              </tr>
            ) : (
              paginated.map((r) => {
                const isLowStock = r.currentStock <= r.reorderPoint;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {r.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                      {r.orderId}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate" title={r.productName}>
                        {r.productName}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400">{r.sku}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {r.unitsSold}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(r.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      {r.profitMarginPercent}%
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          r.currentStock <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {r.currentStock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500">
                      {r.leadTimeDays}d
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 truncate max-w-[140px]" title={r.supplier}>
                      {r.supplier}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRecords.length} records)
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-medium text-slate-700">{currentPage}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
