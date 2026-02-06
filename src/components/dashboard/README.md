# Dashboard Components

Professional dashboard for the Caryn Ops delinquent member tracking system.

## Overview

The dashboard provides a complete interface for managing delinquent member data with:
- Sidebar navigation
- Statistics overview
- CSV file upload with drag-and-drop
- Agencies data table with sorting and filtering

## Components

### Dashboard (Main Layout)

The main container component that orchestrates all dashboard features.

**Location:** `src/components/dashboard/Dashboard.tsx`

**Features:**
- Manages state for uploaded data
- Coordinates data flow between components
- Calculates statistics from uploaded CSV files
- Professional slate-50 background with white cards

**Usage:**
```typescript
import { Dashboard } from '@/components/dashboard/Dashboard';

function App() {
  return <Dashboard />;
}
```

### Sidebar

Left navigation sidebar with professional styling.

**Location:** `src/components/dashboard/Sidebar.tsx`

**Features:**
- Navigation items: Dashboard, Uploads, Agencies, Outreach, Analytics, Settings
- Active state highlighting
- Brand logo section
- User profile footer
- Clean, minimal design with slate colors

**Props:**
```typescript
interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}
```

### Stats

Statistics row displaying key metrics.

**Location:** `src/components/dashboard/Stats.tsx`

**Features:**
- 4 stat cards: Total Due, Response Rate, Active Agencies, Avg. Days Late
- Currency formatting
- Percentage display
- Change indicators (positive/negative)
- Icon indicators for each metric
- Responsive grid layout

**Props:**
```typescript
interface StatsProps {
  totalDue?: number;
  responseRate?: number;
  totalAgencies?: number;
  avgDaysLate?: number;
}
```

**Example:**
```typescript
<Stats
  totalDue={125000}
  responseRate={67.3}
  totalAgencies={15}
  avgDaysLate={45}
/>
```

### FileUpload

Drag-and-drop CSV file upload component using react-dropzone.

**Location:** `src/components/dashboard/FileUpload.tsx`

**Features:**
- Drag-and-drop interface
- CSV validation before parsing
- Real-time parsing with PapaParse
- Upload status indicators (idle, success, error)
- Parse results summary (members, agencies, errors)
- Visual feedback with icons and colors
- Required format information display

**Props:**
```typescript
interface FileUploadProps {
  onUploadComplete?: (result: CSVParseResult) => void;
  onUploadError?: (error: Error) => void;
}
```

**States:**
- **Idle:** Default state, ready to accept files
- **Uploading:** Processing file with spinner
- **Success:** Green border, checkmark, parse summary
- **Error:** Red border, error icon, error message

**Example:**
```typescript
<FileUpload
  onUploadComplete={(result) => {
    console.log(`Uploaded ${result.totalMembers} members`);
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
  }}
/>
```

### AgenciesTable

Data table powered by TanStack Table with sorting and filtering.

**Location:** `src/components/dashboard/AgenciesTable.tsx`

**Features:**
- Sortable columns (name, member count, total due, avg days late)
- Global search/filter
- Status badges (active, needs_lookup, inactive)
- Currency formatting
- Color-coded days late (red > 60, amber 30-60, normal < 30)
- "Needs Email" indicator for agencies without contact info
- Empty state message
- Professional table styling with hover effects

**Props:**
```typescript
interface AgenciesTableProps {
  data: AgencyData[];
}

interface AgencyData {
  id: string;
  name: string;
  email: string | null;
  memberCount: number;
  totalAmountDue: number;
  avgDaysLate: number;
  status: 'active' | 'needs_lookup' | 'inactive';
}
```

**Columns:**
1. **Agency Name** - With "Needs Email" badge if applicable
2. **Contact Email** - Shows "No email provided" if missing
3. **Members** - Count of members
4. **Total Due** - Formatted currency
5. **Avg. Days Late** - Color-coded by severity
6. **Status** - Badge indicator

**Example:**
```typescript
const agencies: AgencyData[] = [
  {
    id: '1',
    name: 'ABC Collections',
    email: 'agent@abccollections.com',
    memberCount: 25,
    totalAmountDue: 45000,
    avgDaysLate: 45,
    status: 'active'
  }
];

<AgenciesTable data={agencies} />
```

## Styling

### Color Palette
- **Background:** `bg-slate-50` - Main page background
- **Cards:** `bg-white` with `border-slate-200`
- **Text Primary:** `text-slate-900`
- **Text Secondary:** `text-slate-600`
- **Borders:** `border-slate-200`
- **Hover:** `hover:bg-slate-50`

### Design Principles
1. **Professional:** Clean lines, subtle shadows, minimal colors
2. **Consistent:** Uniform spacing, border radius, typography
3. **Accessible:** High contrast, clear labels, readable fonts
4. **Responsive:** Grid layouts adapt to screen sizes

## Data Flow

```
CSV File
    ↓
FileUpload (validates & parses)
    ↓
Dashboard (receives CSVParseResult)
    ↓
    ├→ Stats (calculates metrics)
    └→ AgenciesTable (transforms to AgencyData[])
```

## Integration with CSV Parser

The dashboard integrates seamlessly with the CSV parser utility:

```typescript
import { parseCSV, calculateStatistics } from '@/utils/csvParser';

const handleUploadComplete = (result: CSVParseResult) => {
  // Calculate statistics
  const stats = calculateStatistics(result.data);

  // Transform to AgencyData format
  const agencies = Object.values(result.data).map(agency => ({
    id: agency.agency_name,
    name: agency.agency_name,
    email: agency.agency_email || null,
    memberCount: agency.members.length,
    totalAmountDue: agency.members.reduce(
      (sum, m) => sum + m.amount_due, 0
    ),
    avgDaysLate: agency.members.reduce(
      (sum, m) => sum + (m.days_late || 0), 0
    ) / agency.members.length,
    status: agency.needs_lookup ? 'needs_lookup' : 'active'
  }));

  // Update dashboard state
  setAgenciesData(agencies);
  setStatsData(stats);
};
```

## Testing

To test with sample data:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173

3. Drag and drop `sample-data/delinquent_members_sample.csv` onto the upload zone

4. Verify:
   - Stats update with correct totals
   - Agencies table populates with 5 agencies
   - 2 agencies show "Needs Email" badge
   - Sorting and filtering work correctly

## Dependencies

- **react-dropzone** - File upload with drag-and-drop
- **@tanstack/react-table** - Powerful table with sorting/filtering
- **lucide-react** - Professional icon set
- **papaparse** - CSV parsing
- **tailwindcss** - Utility-first CSS

## Customization

### Changing Colors

Edit `tailwind.config.js` to use different color schemes:

```javascript
theme: {
  extend: {
    colors: {
      // Change primary colors here
    }
  }
}
```

### Adding Navigation Items

Edit `Sidebar.tsx`:

```typescript
const navigation = [
  // Add new items here
  { name: 'Reports', icon: FileText, id: 'reports' },
];
```

### Adding Stats

Edit `Stats.tsx` to add more stat cards:

```typescript
<StatCard
  title="New Metric"
  value={yourValue}
  icon={<YourIcon className="w-6 h-6 text-slate-600" />}
/>
```

### Adding Table Columns

Edit `AgenciesTable.tsx` columns definition:

```typescript
{
  accessorKey: 'newField',
  header: 'New Column',
  cell: ({ row }) => <span>{row.getValue('newField')}</span>
}
```

## Future Enhancements

Potential improvements:
- [ ] Pagination for large datasets
- [ ] Export to Excel/PDF
- [ ] Bulk actions (email, status update)
- [ ] Agency detail modal/page
- [ ] Dark mode support
- [ ] Data visualization charts
- [ ] Real-time updates via WebSocket
- [ ] Advanced filtering options
- [ ] Saved views/filters
- [ ] User permissions/roles

## Accessibility

The dashboard follows accessibility best practices:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- High contrast ratios
- Focus indicators
- Screen reader friendly

## Performance

Optimizations implemented:
- React.memo for expensive components
- useMemo for computed values
- Virtualization ready (can add for large tables)
- Code splitting with lazy loading
- Optimized bundle size

## Browser Support

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome)
