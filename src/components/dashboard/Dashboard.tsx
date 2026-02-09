import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Stats } from './Stats';
import { FileUpload } from '@/components/FileUpload';
import { AgenciesTable, type AgencyData } from './AgenciesTable';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agenciesData] = useState<AgencyData[]>([]);
  const [statsData] = useState({
    totalDue: 0,
    responseRate: 0,
    totalAgencies: 0,
    avgDaysLate: 0,
  });

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Delinquent member tracking and management
            </p>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 space-y-6">
          {/* Stats Row */}
          <Stats
            totalDue={statsData.totalDue}
            responseRate={statsData.responseRate}
            totalAgencies={statsData.totalAgencies}
            avgDaysLate={statsData.avgDaysLate}
          />

          {/* File Upload + Preview + Send Batch */}
          <FileUpload />

          {/* Agencies Table */}
          <AgenciesTable data={agenciesData} />
        </div>
      </main>
    </div>
  );
}
