// Supabase Edge Function: send-batch-email
// Sends batch delinquent member emails via Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface Member {
  name: string;
  amount_due: number;
  days_late?: number;
  member_id?: string;
}

interface EmailRequest {
  agent_email: string;
  member_list: Member[];
  reply_to: string;
  agency_name?: string;
  subject?: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

/**
 * Formats currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Generates HTML email template with member list
 */
function generateEmailHTML(members: Member[], agencyName?: string): string {
  const totalAmount = members.reduce((sum, member) => sum + member.amount_due, 0);
  const memberCount = members.length;

  // Generate table rows
  const tableRows = members
    .map(
      (member, index) => `
    <tr style="${index % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
      <td style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">
        <strong style="color: #1e293b;">${member.name}</strong>
        ${member.member_id ? `<br><span style="color: #64748b; font-size: 12px;">ID: ${member.member_id}</span>` : ''}
      </td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 600;">
        ${formatCurrency(member.amount_due)}
      </td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">
        <span style="
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          ${
            (member.days_late || 0) > 60
              ? 'background-color: #fee2e2; color: #991b1b;'
              : (member.days_late || 0) > 30
              ? 'background-color: #fef3c7; color: #92400e;'
              : 'background-color: #e2e8f0; color: #475569;'
          }
        ">
          ${member.days_late || 0} days
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delinquent Members Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Delinquent Members Report
              </h1>
              ${agencyName ? `<p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">${agencyName}</p>` : ''}
            </td>
          </tr>

          <!-- Summary Section -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 50%;">
                    <div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      Total Members
                    </div>
                    <div style="color: #0f172a; font-size: 32px; font-weight: 700;">
                      ${memberCount}
                    </div>
                  </td>
                  <td style="width: 20px;"></td>
                  <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; text-align: center; width: 50%;">
                    <div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      Total Amount Due
                    </div>
                    <div style="color: #dc2626; font-size: 32px; font-weight: 700;">
                      ${formatCurrency(totalAmount)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Members Table -->
          <tr>
            <td style="padding: 32px 40px;">
              <h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 18px; font-weight: 600;">
                Member Details
              </h2>

              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">
                      Member Name
                    </th>
                    <th style="padding: 12px; text-align: right; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">
                      Amount Due
                    </th>
                    <th style="padding: 12px; text-align: center; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">
                      Days Late
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Action Section -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Please review the above delinquent accounts and take appropriate action. If you have any questions or need additional information, please reply to this email.
              </p>
              <p style="margin: 16px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                This is an automated report from the Caryn Ops delinquent member tracking system.
                Report generated on ${new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}.
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">
                Caryn Ops - Delinquent Member Tracking System
              </p>
              <p style="margin: 8px 0 0 0;">
                © ${new Date().getFullYear()} All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Main handler function
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Parse request body
    const { agent_email, member_list, reply_to, agency_name, subject }: EmailRequest =
      await req.json();

    // Validate required fields
    if (!agent_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: agent_email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!member_list || !Array.isArray(member_list) || member_list.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid field: member_list (must be non-empty array)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!reply_to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: reply_to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(agent_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format: agent_email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!emailRegex.test(reply_to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format: reply_to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate member list items
    for (const member of member_list) {
      if (!member.name || typeof member.name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Each member must have a valid name field' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (typeof member.amount_due !== 'number' || member.amount_due < 0) {
        return new Response(
          JSON.stringify({ error: 'Each member must have a valid amount_due (non-negative number)' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Generate HTML email content
    const htmlContent = generateEmailHTML(member_list, agency_name);

    // Prepare email subject
    const emailSubject =
      subject ||
      `Delinquent Members Report - ${member_list.length} Account${member_list.length !== 1 ? 's' : ''}`;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'CarynHealth Operations <onboarding@resend.dev>',
        to: [agent_email],
        reply_to: reply_to,
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    // Check if email was sent successfully
    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: resendData,
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: resendData.id,
        recipient: agent_email,
        member_count: member_list.length,
        total_amount: member_list.reduce((sum, m) => sum + m.amount_due, 0),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-batch-email function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
