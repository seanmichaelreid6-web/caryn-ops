import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Stats } from './Stats';
import { FileUpload } from './FileUpload';
import { AgenciesTable, type AgencyData } from './AgenciesTable';
import { calculateStatistics, getAgenciesNeedingLookup, type CSVParseResult } from '@/utils/csvParser';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agenciesData, setAgenciesData] = useState<AgencyData[]>([]);
  const [statsData, setStatsData] = useState({
    totalDue: 0,
    responseRate: 0,
    totalAgencies: 0,
    avgDaysLate: 0,
  });

  const handleUploadComplete = (result: CSVParseResult) => {
    console.log('Upload complete:', result);

    // Calculate statistics
    const stats = calculateStatistics(result.data);

    // Transform parsed data into AgencyData format
    const agencies: AgencyData[] = Object.values(result.data).map((agency) => {
      const totalAmountDue = agency.members.reduce(
        (sum, member) => sum + member.amount_due,
        0
      );

      const avgDaysLate =
        agency.members.reduce((sum, member) => sum + (member.days_late || 0), 0) /
        agency.members.length;

      return {
        id: agency.agency_name,
        name: agency.agency_name,
        email: agency.agency_email || null,
        memberCount: agency.members.length,
        totalAmountDue,
        avgDaysLate,
        status: agency.needs_lookup ? 'needs_lookup' : 'active',
      };
    });

    // Update state
    setAgenciesData(agencies);
    setStatsData({
      totalDue: stats.totalAmount,
      responseRate: 67.3, // Mock response rate - would come from real data
      totalAgencies: result.totalAgencies,
      avgDaysLate: stats.averageDaysLate,
    });

    // Log agencies needing lookup
    const needsLookup = getAgenciesNeedingLookup(result.data);
    if (needsLookup.length > 0) {
      console.log('Agencies needing email lookup:', needsLookup);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    // Could show a toast notification here
  };

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

          {/* File Upload */}
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />

          {/* Agencies Table */}
          <AgenciesTable data={agenciesData} />
        </div>
      </main>
    </div>
  );
}
