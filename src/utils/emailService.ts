/**
 * Email Service
 * Utilities for sending batch emails via Supabase Edge Functions
 */

// Note: Install @supabase/supabase-js first:
// npm install @supabase/supabase-js

// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// );

export interface EmailMember {
  name: string;
  amount_due: number;
  days_late?: number;
  member_id?: string;
}

export interface SendBatchEmailRequest {
  agent_email: string;
  member_list: EmailMember[];
  reply_to: string;
  agency_name?: string;
  subject?: string;
}

export interface SendBatchEmailResponse {
  success: boolean;
  message: string;
  email_id: string;
  recipient: string;
  member_count: number;
  total_amount: number;
}

export interface EmailError {
  error: string;
  message?: string;
  details?: any;
}

/**
 * Sends a batch email with delinquent member information
 *
 * @param request - Email request parameters
 * @returns Promise resolving to the email response
 *
 * @example
 * ```typescript
 * const result = await sendBatchEmail({
 *   agent_email: 'agent@agency.com',
 *   reply_to: 'support@carynops.com',
 *   agency_name: 'ABC Collections',
 *   member_list: [
 *     { name: 'John Doe', amount_due: 1250.50, days_late: 45 }
 *   ]
 * });
 * ```
 */
export async function sendBatchEmail(
  request: SendBatchEmailRequest
): Promise<SendBatchEmailResponse> {
  // TODO: Uncomment when Supabase client is configured
  // const { data, error } = await supabase.functions.invoke('send-batch-email', {
  //   body: request,
  // });

  // if (error) {
  //   throw new Error(error.message || 'Failed to send email');
  // }

  // return data as SendBatchEmailResponse;

  // Temporary mock for development (remove when ready to use)
  console.log('sendBatchEmail called with:', request);
  throw new Error(
    'Supabase client not configured. Please uncomment the code in src/utils/emailService.ts and set up environment variables.'
  );
}

/**
 * Validates email request before sending
 *
 * @param request - Email request to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateEmailRequest(request: SendBatchEmailRequest): {
  valid: boolean;
  error?: string;
} {
  // Validate agent_email
  if (!request.agent_email || typeof request.agent_email !== 'string') {
    return { valid: false, error: 'agent_email is required and must be a string' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(request.agent_email)) {
    return { valid: false, error: 'agent_email must be a valid email address' };
  }

  // Validate reply_to
  if (!request.reply_to || typeof request.reply_to !== 'string') {
    return { valid: false, error: 'reply_to is required and must be a string' };
  }

  if (!emailRegex.test(request.reply_to)) {
    return { valid: false, error: 'reply_to must be a valid email address' };
  }

  // Validate member_list
  if (!Array.isArray(request.member_list)) {
    return { valid: false, error: 'member_list must be an array' };
  }

  if (request.member_list.length === 0) {
    return { valid: false, error: 'member_list cannot be empty' };
  }

  // Validate each member
  for (let i = 0; i < request.member_list.length; i++) {
    const member = request.member_list[i];

    if (!member.name || typeof member.name !== 'string') {
      return {
        valid: false,
        error: `Member at index ${i} must have a valid name`,
      };
    }

    if (typeof member.amount_due !== 'number' || member.amount_due < 0) {
      return {
        valid: false,
        error: `Member at index ${i} must have a valid amount_due (non-negative number)`,
      };
    }

    if (
      member.days_late !== undefined &&
      (typeof member.days_late !== 'number' || member.days_late < 0)
    ) {
      return {
        valid: false,
        error: `Member at index ${i} has invalid days_late (must be non-negative number)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sends emails to multiple agencies in batch
 *
 * @param requests - Array of email requests
 * @returns Promise resolving to array of results
 */
export async function sendBatchEmailsToAgencies(
  requests: SendBatchEmailRequest[]
): Promise<Array<SendBatchEmailResponse | EmailError>> {
  const results = await Promise.allSettled(
    requests.map((request) => sendBatchEmail(request))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        error: 'Failed to send email',
        message: result.reason?.message || 'Unknown error',
        details: requests[index],
      };
    }
  });
}

/**
 * Formats members from CSV parse result for email sending
 *
 * @param members - Array of parsed members
 * @returns Array of email members
 */
export function formatMembersForEmail(
  members: Array<{
    name: string;
    amount_due: number;
    days_late?: number;
    member_id?: string;
  }>
): EmailMember[] {
  return members.map((member) => ({
    name: member.name,
    amount_due: member.amount_due,
    days_late: member.days_late,
    member_id: member.member_id,
  }));
}

/**
 * Example usage in a React component
 */
export const exampleUsage = `
import { sendBatchEmail, validateEmailRequest } from '@/utils/emailService';
import { useState } from 'react';

function SendEmailButton({ agency, members }) {
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    const request = {
      agent_email: agency.email,
      reply_to: 'support@carynops.com',
      agency_name: agency.name,
      member_list: members.map(m => ({
        name: m.name,
        amount_due: m.amount_due,
        days_late: m.days_late,
        member_id: m.member_id
      }))
    };

    // Validate before sending
    const validation = validateEmailRequest(request);
    if (!validation.valid) {
      alert('Validation error: ' + validation.error);
      return;
    }

    setSending(true);
    try {
      const result = await sendBatchEmail(request);
      console.log('Email sent:', result);
      alert(\`Email sent successfully to \${result.recipient}\`);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <button onClick={handleSendEmail} disabled={sending}>
      {sending ? 'Sending...' : 'Send Email'}
    </button>
  );
}
`;
