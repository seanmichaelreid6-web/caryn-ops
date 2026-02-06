import { DollarSign, TrendingUp, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-2 font-medium',
                changeType === 'positive' && 'text-green-600',
                changeType === 'negative' && 'text-red-600',
                changeType === 'neutral' && 'text-slate-500'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface StatsProps {
  totalDue?: number;
  responseRate?: number;
  totalAgencies?: number;
  avgDaysLate?: number;
}

export function Stats({
  totalDue = 0,
  responseRate = 0,
  totalAgencies = 0,
  avgDaysLate = 0,
}: StatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Amount Due"
        value={formatCurrency(totalDue)}
        change="+12.5% from last month"
        changeType="positive"
        icon={<DollarSign className="w-6 h-6 text-slate-600" />}
      />

      <StatCard
        title="Response Rate"
        value={formatPercentage(responseRate)}
        change={responseRate >= 50 ? '+5.2% from last month' : 'Below target'}
        changeType={responseRate >= 50 ? 'positive' : 'negative'}
        icon={<TrendingUp className="w-6 h-6 text-slate-600" />}
      />

      <StatCard
        title="Active Agencies"
        value={totalAgencies}
        change={`${totalAgencies} agencies tracked`}
        changeType="neutral"
        icon={<Building2 className="w-6 h-6 text-slate-600" />}
      />

      <StatCard
        title="Avg. Days Late"
        value={Math.round(avgDaysLate)}
        change={avgDaysLate > 60 ? 'Action required' : 'Within acceptable range'}
        changeType={avgDaysLate > 60 ? 'negative' : 'positive'}
        icon={<Clock className="w-6 h-6 text-slate-600" />}
      />
    </div>
  );
}
