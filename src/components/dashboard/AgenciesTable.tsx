import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgencyData {
  id: string;
  name: string;
  email: string | null;
  memberCount: number;
  totalAmountDue: number;
  avgDaysLate: number;
  status: 'active' | 'needs_lookup' | 'inactive';
}

interface AgenciesTableProps {
  data: AgencyData[];
}

export function AgenciesTable({ data }: AgenciesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<AgencyData>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-2 hover:text-slate-900 font-medium"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Agency Name
              <ArrowUpDown className="w-4 h-4" />
            </button>
          );
        },
        cell: ({ row }) => {
          const needsLookup = row.original.status === 'needs_lookup';
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{row.getValue('name')}</span>
              {needsLookup && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <AlertCircle className="w-3 h-3" />
                  Needs Email
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Contact Email',
        cell: ({ row }) => {
          const email = row.getValue('email') as string | null;
          return (
            <span className={cn('text-sm', email ? 'text-slate-600' : 'text-slate-400 italic')}>
              {email || 'No email provided'}
            </span>
          );
        },
      },
      {
        accessorKey: 'memberCount',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-2 hover:text-slate-900 font-medium"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Members
              <ArrowUpDown className="w-4 h-4" />
            </button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="text-sm font-medium text-slate-900">
              {row.getValue('memberCount')}
            </span>
          );
        },
      },
      {
        accessorKey: 'totalAmountDue',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-2 hover:text-slate-900 font-medium"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Total Due
              <ArrowUpDown className="w-4 h-4" />
            </button>
          );
        },
        cell: ({ row }) => {
          const amount = row.getValue('totalAmountDue') as number;
          return (
            <span className="text-sm font-semibold text-slate-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(amount)}
            </span>
          );
        },
      },
      {
        accessorKey: 'avgDaysLate',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-2 hover:text-slate-900 font-medium"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Avg. Days Late
              <ArrowUpDown className="w-4 h-4" />
            </button>
          );
        },
        cell: ({ row }) => {
          const days = row.getValue('avgDaysLate') as number;
          const roundedDays = Math.round(days);
          return (
            <span
              className={cn(
                'text-sm font-medium',
                roundedDays > 60 && 'text-red-600',
                roundedDays > 30 && roundedDays <= 60 && 'text-amber-600',
                roundedDays <= 30 && 'text-slate-600'
              )}
            >
              {roundedDays} days
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as AgencyData['status'];
          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                status === 'active' && 'bg-green-100 text-green-700',
                status === 'needs_lookup' && 'bg-amber-100 text-amber-700',
                status === 'inactive' && 'bg-slate-100 text-slate-600'
              )}
            >
              {status === 'active' && 'Active'}
              {status === 'needs_lookup' && 'Needs Lookup'}
              {status === 'inactive' && 'Inactive'}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agencies</h2>
            <p className="text-sm text-slate-500 mt-1">
              {data.length} {data.length === 1 ? 'agency' : 'agencies'} in the system
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No agencies found. Upload a CSV file to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600">
            Showing {table.getRowModel().rows.length} of {data.length} agencies
          </p>
        </div>
      )}
    </div>
  );
}
