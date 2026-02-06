# CSV Parser Utility

A robust CSV parsing utility for the Caryn Ops delinquent member tracking system, built with PapaParse.

## Features

- Parse CSV files with member delinquency data
- Automatic header mapping (`Member Name` → `name`, `Amount` → `amount_due`, etc.)
- Group members by agency name
- Handle missing agency emails with `needs_lookup` flag
- Comprehensive error handling and validation
- TypeScript types for type safety
- Helper functions for statistics and filtering

## Installation

The required dependencies are already installed:
- `papaparse` - CSV parsing library
- `@types/papaparse` - TypeScript definitions

## Usage

### Basic CSV Parsing

```typescript
import { parseCSV } from '@/utils/csvParser';

const handleFileUpload = async (file: File) => {
  const result = await parseCSV(file);

  console.log(`Parsed ${result.totalMembers} members`);
  console.log(`Found ${result.totalAgencies} agencies`);

  // Access members by agency
  Object.entries(result.data).forEach(([agencyName, agency]) => {
    console.log(`${agencyName}: ${agency.members.length} members`);

    if (agency.needs_lookup) {
      console.warn(`⚠️ ${agencyName} needs email lookup`);
    }
  });
};
```

### Validate Headers Before Parsing

```typescript
import { validateCSVHeaders } from '@/utils/csvParser';

const checkHeaders = async (file: File) => {
  const validation = await validateCSVHeaders(file);

  if (!validation.valid) {
    alert(`Missing columns: ${validation.missingHeaders.join(', ')}`);
    return false;
  }

  return true;
};
```

### Get Agencies Needing Lookup

```typescript
import { parseCSV, getAgenciesNeedingLookup } from '@/utils/csvParser';

const result = await parseCSV(file);
const needsLookup = getAgenciesNeedingLookup(result.data);

if (needsLookup.length > 0) {
  console.log('Agencies without emails:', needsLookup);
}
```

### Calculate Statistics

```typescript
import { parseCSV, calculateStatistics } from '@/utils/csvParser';

const result = await parseCSV(file);
const stats = calculateStatistics(result.data);

console.log('Total amount due:', stats.totalAmount);
console.log('Average days late:', stats.averageDaysLate);
console.log('Agencies needing lookup:', stats.agenciesNeedingLookup);
```

## CSV Format

### Required Headers
- `Member Name` - Full name of the member
- `Amount` - Amount due (can include $ and commas)
- `Agency` - Collection agency name

### Optional Headers
- `Agency Email` - Agency contact email
- `Days Late` - Number of days payment is late
- `Member ID` - Unique member identifier
- `Phone` - Member phone number
- `Email` - Member email address

### Sample CSV

```csv
Member Name,Amount,Agency,Agency Email,Days Late,Member ID,Phone,Email
John Doe,$1,250.50,ABC Collections,agent@abccollections.com,45,M12345,555-0123,john.doe@example.com
Jane Smith,3500.00,XYZ Recovery,,67,M12346,555-0124,jane.smith@example.com
```

See [sample-data/delinquent_members_sample.csv](../../sample-data/delinquent_members_sample.csv) for a complete example.

## Data Structure

### ParsedMember
```typescript
interface ParsedMember {
  name: string;
  amount_due: number;
  agency_name: string;
  agency_email?: string;
  days_late?: number;
  member_id?: string;
  phone?: string;
  email?: string;
}
```

### AgencyWithMembers
```typescript
interface AgencyWithMembers {
  agency_name: string;
  agency_email?: string;
  needs_lookup: boolean;  // true if agency_email is missing
  members: ParsedMember[];
}
```

### CSVParseResult
```typescript
interface CSVParseResult {
  data: {
    [agencyName: string]: AgencyWithMembers;
  };
  errors: ParseError[];
  totalMembers: number;
  totalAgencies: number;
}
```

## Error Handling

The parser collects errors without stopping, allowing you to process valid rows and report issues:

```typescript
const result = await parseCSV(file);

if (result.errors.length > 0) {
  console.warn('Parsing errors encountered:');
  result.errors.forEach(error => {
    console.log(`Row ${error.row}: ${error.message}`);
  });
}

// Valid data is still available in result.data
console.log(`Successfully parsed ${result.totalMembers} members`);
```

### Common Errors
- Missing required fields (Member Name, Amount, or Agency)
- Invalid amount format (non-numeric values)
- Negative amounts
- Invalid days late (non-numeric or negative)

## Header Mapping

The parser automatically maps CSV headers to database field names:

| CSV Header    | Mapped Field   | Type   | Required |
|---------------|----------------|--------|----------|
| Member Name   | name           | string | Yes      |
| Amount        | amount_due     | number | Yes      |
| Agency        | agency_name    | string | Yes      |
| Agency Email  | agency_email   | string | No       |
| Days Late     | days_late      | number | No       |
| Member ID     | member_id      | string | No       |
| Phone         | phone          | string | No       |
| Email         | email          | string | No       |

## Agency Email Lookup

When an agency row has no `Agency Email`, it's marked with `needs_lookup: true`:

```typescript
const result = await parseCSV(file);

Object.values(result.data).forEach(agency => {
  if (agency.needs_lookup) {
    console.log(`Need to find email for: ${agency.agency_name}`);
    // Trigger lookup process, prompt user, etc.
  }
});
```

### Handling Missing Emails
1. **Automatic resolution**: If later rows for the same agency include an email, it updates automatically
2. **Manual lookup**: Use `getAgenciesNeedingLookup()` to get a list for manual entry
3. **Default value**: Assign a placeholder like `"pending@lookup.com"`

## Examples

See [csvParser.example.ts](./csvParser.example.ts) for comprehensive usage examples including:
- React component integration
- Database preparation
- Filtering high-priority members
- JSON export
- Statistical analysis

## Integration with Supabase

```typescript
import { parseCSV } from '@/utils/csvParser';
import { supabase } from '@/lib/supabaseClient';

async function uploadToDatabase(file: File) {
  const result = await parseCSV(file);

  // Insert upload record
  const { data: upload } = await supabase
    .from('uploads')
    .insert({ filename: file.name })
    .select()
    .single();

  // Insert agencies
  for (const agency of Object.values(result.data)) {
    const { data: agencyRecord } = await supabase
      .from('agencies')
      .insert({
        name: agency.agency_name,
        agent_email: agency.agency_email || 'pending@lookup.com'
      })
      .select()
      .single();

    // Insert members
    const membersToInsert = agency.members.map(member => ({
      name: member.name,
      amount_due: member.amount_due,
      days_late: member.days_late || 0,
      agency_id: agencyRecord.id,
      upload_id: upload.id,
      status: 'pending'
    }));

    await supabase.from('members').insert(membersToInsert);
  }
}
```

## Testing

Test the parser with the included sample CSV:

```bash
# Location: sample-data/delinquent_members_sample.csv
# Contains 10 members across 5 agencies
# 2 agencies need email lookup (XYZ Recovery, Rapid Collections)
```

## Notes

- Amount parsing handles currency symbols ($) and thousands separators (,)
- Headers are trimmed of whitespace automatically
- Empty lines in the CSV are skipped
- Agency grouping is case-sensitive
- All monetary values are stored as numbers with 2 decimal precision
