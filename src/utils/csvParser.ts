import Papa from 'papaparse';

/**
 * Represents a parsed member from the CSV file
 */
export interface ParsedMember {
  name: string;
  amount_due: number;
  agency_name: string;
  agency_email?: string;
  days_late?: number;
  member_id?: string;
  phone?: string;
  email?: string;
}

/**
 * Represents an agency with its members
 */
export interface AgencyWithMembers {
  agency_name: string;
  agency_email?: string;
  needs_lookup: boolean;
  members: ParsedMember[];
}

/**
 * Result of CSV parsing grouped by agency
 */
export interface ParsedCSVResult {
  [agencyName: string]: AgencyWithMembers;
}

/**
 * Error information for parsing failures
 */
export interface ParseError {
  row: number;
  message: string;
  data?: any;
}

/**
 * Complete parsing result with data and errors
 */
export interface CSVParseResult {
  data: ParsedCSVResult;
  errors: ParseError[];
  totalMembers: number;
  totalAgencies: number;
}

/**
 * Raw CSV row interface (before mapping)
 */
interface CSVRow {
  'Member Name'?: string;
  'Amount'?: string;
  'Agency'?: string;
  'Agency Email'?: string;
  'Days Late'?: string;
  'Member ID'?: string;
  'Phone'?: string;
  'Email'?: string;
  [key: string]: string | undefined;
}

/**
 * Parses a CSV file and groups members by agency
 *
 * @param file - The CSV file to parse
 * @returns Promise resolving to grouped member data
 *
 * @example
 * ```typescript
 * const result = await parseCSV(file);
 * console.log(result.data['ABC Collections'].members);
 * ```
 */
export async function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const errors: ParseError[] = [];
    const agencyMap: ParsedCSVResult = {};
    let totalMembers = 0;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        // Process each row
        results.data.forEach((row, index) => {
          try {
            // Extract and validate required fields
            const memberName = row['Member Name']?.trim();
            const amountStr = row['Amount']?.trim();
            const agencyName = row['Agency']?.trim();

            // Validate required fields
            if (!memberName || !amountStr || !agencyName) {
              errors.push({
                row: index + 2, // +2 for header row and 0-based index
                message: 'Missing required fields (Member Name, Amount, or Agency)',
                data: row
              });
              return;
            }

            // Parse and validate amount
            const amountDue = parseFloat(amountStr.replace(/[$,]/g, ''));
            if (isNaN(amountDue) || amountDue < 0) {
              errors.push({
                row: index + 2,
                message: `Invalid amount: ${amountStr}`,
                data: row
              });
              return;
            }

            // Extract optional fields
            const agencyEmail = row['Agency Email']?.trim() || undefined;
            const daysLateStr = row['Days Late']?.trim();
            const daysLate = daysLateStr ? parseInt(daysLateStr, 10) : undefined;
            const memberId = row['Member ID']?.trim() || undefined;
            const phone = row['Phone']?.trim() || undefined;
            const email = row['Email']?.trim() || undefined;

            // Validate days late if provided
            if (daysLateStr && (isNaN(daysLate!) || daysLate! < 0)) {
              errors.push({
                row: index + 2,
                message: `Invalid days late: ${daysLateStr}`,
                data: row
              });
              return;
            }

            // Create member object
            const member: ParsedMember = {
              name: memberName,
              amount_due: amountDue,
              agency_name: agencyName,
              agency_email: agencyEmail,
              days_late: daysLate,
              member_id: memberId,
              phone: phone,
              email: email
            };

            // Initialize agency group if it doesn't exist
            if (!agencyMap[agencyName]) {
              agencyMap[agencyName] = {
                agency_name: agencyName,
                agency_email: agencyEmail,
                needs_lookup: !agencyEmail,
                members: []
              };
            } else {
              // Update agency email if current entry has one and existing doesn't
              if (agencyEmail && !agencyMap[agencyName].agency_email) {
                agencyMap[agencyName].agency_email = agencyEmail;
                agencyMap[agencyName].needs_lookup = false;
              }
            }

            // Add member to agency group
            agencyMap[agencyName].members.push(member);
            totalMembers++;

          } catch (error) {
            errors.push({
              row: index + 2,
              message: error instanceof Error ? error.message : 'Unknown parsing error',
              data: row
            });
          }
        });

        // Handle PapaParse errors
        if (results.errors.length > 0) {
          results.errors.forEach((error) => {
            errors.push({
              row: error.row ?? -1,
              message: error.message,
              data: error
            });
          });
        }

        // Resolve with results
        resolve({
          data: agencyMap,
          errors,
          totalMembers,
          totalAgencies: Object.keys(agencyMap).length
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

/**
 * Validates CSV headers to ensure required columns are present
 *
 * @param file - The CSV file to validate
 * @returns Promise resolving to validation result
 */
export async function validateCSVHeaders(file: File): Promise<{
  valid: boolean;
  missingHeaders: string[];
  foundHeaders: string[];
}> {
  return new Promise((resolve, reject) => {
    const requiredHeaders = ['Member Name', 'Amount', 'Agency'];

    Papa.parse(file, {
      header: true,
      preview: 1,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const foundHeaders = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(
          header => !foundHeaders.includes(header)
        );

        resolve({
          valid: missingHeaders.length === 0,
          missingHeaders,
          foundHeaders
        });
      },
      error: (error) => {
        reject(new Error(`Header validation failed: ${error.message}`));
      }
    });
  });
}

/**
 * Gets a summary of agencies that need email lookup
 *
 * @param parseResult - The parsed CSV result
 * @returns Array of agency names that need lookup
 */
export function getAgenciesNeedingLookup(parseResult: ParsedCSVResult): string[] {
  return Object.values(parseResult)
    .filter(agency => agency.needs_lookup)
    .map(agency => agency.agency_name);
}

/**
 * Calculates statistics from parsed CSV data
 *
 * @param parseResult - The parsed CSV result
 * @returns Statistics object
 */
export function calculateStatistics(parseResult: ParsedCSVResult) {
  let totalAmount = 0;
  let totalDaysLate = 0;
  let membersWithDaysLate = 0;

  Object.values(parseResult).forEach(agency => {
    agency.members.forEach(member => {
      totalAmount += member.amount_due;
      if (member.days_late !== undefined) {
        totalDaysLate += member.days_late;
        membersWithDaysLate++;
      }
    });
  });

  return {
    totalAmount,
    averageDaysLate: membersWithDaysLate > 0 ? totalDaysLate / membersWithDaysLate : 0,
    agenciesNeedingLookup: getAgenciesNeedingLookup(parseResult).length
  };
}
