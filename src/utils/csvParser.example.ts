/**
 * Example usage of the CSV Parser utility
 *
 * This file demonstrates how to use the csvParser functions
 * in your React components or other parts of the application.
 */

import {
  parseCSV,
  validateCSVHeaders,
  getAgenciesNeedingLookup,
  calculateStatistics,
  type CSVParseResult,
  type ParsedCSVResult
} from './csvParser';

/**
 * Example 1: Basic CSV parsing with a file input
 */
export async function handleFileUpload(file: File) {
  try {
    // First, validate the CSV headers
    const validation = await validateCSVHeaders(file);

    if (!validation.valid) {
      console.error('Missing required headers:', validation.missingHeaders);
      throw new Error(
        `Missing required columns: ${validation.missingHeaders.join(', ')}`
      );
    }

    // Parse the CSV file
    const result: CSVParseResult = await parseCSV(file);

    // Check for parsing errors
    if (result.errors.length > 0) {
      console.warn(`Parsed with ${result.errors.length} errors:`, result.errors);
    }

    // Log summary
    console.log(`Successfully parsed ${result.totalMembers} members`);
    console.log(`Found ${result.totalAgencies} agencies`);

    // Get agencies that need email lookup
    const needsLookup = getAgenciesNeedingLookup(result.data);
    if (needsLookup.length > 0) {
      console.warn('Agencies needing email lookup:', needsLookup);
    }

    // Calculate statistics
    const stats = calculateStatistics(result.data);
    console.log('Statistics:', stats);

    return result;
  } catch (error) {
    console.error('CSV parsing failed:', error);
    throw error;
  }
}

/**
 * Example 2: Processing parsed data to prepare for database insertion
 */
export function prepareForDatabase(parseResult: ParsedCSVResult) {
  // Extract unique agencies
  const agencies = Object.values(parseResult).map(agency => ({
    name: agency.agency_name,
    agent_email: agency.agency_email || 'pending@lookup.com',
    needs_lookup: agency.needs_lookup
  }));

  // Flatten all members
  const members = Object.values(parseResult).flatMap(agency =>
    agency.members.map(member => ({
      name: member.name,
      amount_due: member.amount_due,
      days_late: member.days_late || 0,
      agency_name: member.agency_name,
      status: 'pending' as const,
      member_id: member.member_id,
      phone: member.phone,
      email: member.email
    }))
  );

  return { agencies, members };
}

/**
 * Example 3: Filtering and sorting members
 */
export function getHighPriorityMembers(
  parseResult: ParsedCSVResult,
  minAmount: number = 1000,
  minDaysLate: number = 60
) {
  const highPriority: Array<{
    member: string;
    agency: string;
    amount: number;
    daysLate: number;
  }> = [];

  Object.values(parseResult).forEach(agency => {
    agency.members.forEach(member => {
      if (
        member.amount_due >= minAmount &&
        (member.days_late || 0) >= minDaysLate
      ) {
        highPriority.push({
          member: member.name,
          agency: agency.agency_name,
          amount: member.amount_due,
          daysLate: member.days_late || 0
        });
      }
    });
  });

  // Sort by days late descending
  return highPriority.sort((a, b) => b.daysLate - a.daysLate);
}

/**
 * Example 4: React component usage
 */
export const exampleReactComponent = `
import { useState } from 'react';
import { parseCSV, type CSVParseResult } from '@/utils/csvParser';
import { Button } from '@/components/ui/button';

export function CSVUploader() {
  const [result, setResult] = useState<CSVParseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsed = await parseCSV(file);
      setResult(parsed);

      // Show success message
      console.log(\`Parsed \${parsed.totalMembers} members from \${parsed.totalAgencies} agencies\`);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>Parsing CSV...</p>}

      {result && (
        <div>
          <h3>Parse Results</h3>
          <p>Total Members: {result.totalMembers}</p>
          <p>Total Agencies: {result.totalAgencies}</p>
          <p>Errors: {result.errors.length}</p>

          {/* Display agencies */}
          {Object.entries(result.data).map(([agencyName, agency]) => (
            <div key={agencyName}>
              <h4>{agencyName}</h4>
              {agency.needs_lookup && <span>⚠️ Email needs lookup</span>}
              <p>{agency.members.length} members</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;

/**
 * Example 5: Export data to JSON for API submission
 */
export function exportToJSON(parseResult: ParsedCSVResult): string {
  const formatted = {
    uploadDate: new Date().toISOString(),
    summary: {
      totalAgencies: Object.keys(parseResult).length,
      totalMembers: Object.values(parseResult).reduce(
        (sum, agency) => sum + agency.members.length,
        0
      ),
      agenciesNeedingLookup: getAgenciesNeedingLookup(parseResult).length
    },
    agencies: Object.values(parseResult).map(agency => ({
      name: agency.agency_name,
      email: agency.agency_email,
      needsLookup: agency.needs_lookup,
      memberCount: agency.members.length,
      totalAmountDue: agency.members.reduce(
        (sum, m) => sum + m.amount_due,
        0
      ),
      members: agency.members
    }))
  };

  return JSON.stringify(formatted, null, 2);
}
