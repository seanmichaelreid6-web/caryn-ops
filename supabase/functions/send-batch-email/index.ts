// Supabase Edge Function: send-batch-email
// Sends per-member delinquent account notification emails via Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface Member {
  name: string;
  delinquent_days: number;
  agency_email: string;
  amount_due?: number;
  member_id?: string;
}

interface EmailRequest {
  member_list: Member[];
  reply_to: string;
}

/**
 * Generates the HTML email body for a single member notification
 */
function generateEmailHTML(member: Member): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 40px;">
          <tr>
            <td>
              <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">Good Morning,</p>
              <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">Member <strong>${member.name}</strong> had a declined payment, placing the account on hold.</p>
              <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">At this time, the account is <strong>${member.delinquent_days} days past due</strong>.</p>
              <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 15px; line-height: 1.6;">Please have the member reach out so that we can assist. This is the final notice.</p>
              <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6;">Best,</p>
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
    const { member_list, reply_to }: EmailRequest = await req.json();

    // Validate required fields
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

    if (!emailRegex.test(reply_to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format: reply_to' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate each member in the list
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

      if (typeof member.delinquent_days !== 'number' || member.delinquent_days < 0) {
        return new Response(
          JSON.stringify({ error: 'Each member must have a valid delinquent_days (non-negative number)' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!member.agency_email || !emailRegex.test(member.agency_email)) {
        return new Response(
          JSON.stringify({ error: 'Each member must have a valid agency_email' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Send one email per member to their respective agency
    const results = [];
    const errors = [];

    for (const member of member_list) {
      const htmlContent = generateEmailHTML(member);
      const emailSubject = `Past Due Account Notification - ${member.name}`;

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'CarynHealth Operations <onboarding@resend.dev>',
            to: [member.agency_email],
            reply_to: reply_to,
            subject: emailSubject,
            html: htmlContent,
          }),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          results.push({
            member: member.name,
            recipient: member.agency_email,
            email_id: resendData.id,
            status: 'sent',
          });
        } else {
          errors.push({
            member: member.name,
            recipient: member.agency_email,
            error: resendData,
          });
        }
      } catch (err) {
        errors.push({
          member: member.name,
          recipient: member.agency_email,
          error: err instanceof Error ? err.message : 'Unknown send error',
        });
      }
    }

    // Return combined results
    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `${results.length} of ${member_list.length} emails sent successfully`,
        sent: results,
        failed: errors,
      }),
      {
        status: errors.length === member_list.length ? 500 : 200,
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
