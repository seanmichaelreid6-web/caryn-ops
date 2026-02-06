# Send Batch Email Edge Function

Supabase Edge Function for sending batch delinquent member emails via the Resend API.

## Overview

This function receives a list of delinquent members and sends a professionally formatted HTML email to a collection agency's agent email address. The email includes:
- Summary statistics (total members, total amount due)
- Detailed table of all members with amounts and days late
- Color-coded severity indicators
- Professional styling

## API Endpoint

```
POST https://<your-project-ref>.supabase.co/functions/v1/send-batch-email
```

## Request Format

### Headers
```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

### Body

```typescript
{
  "agent_email": string,      // Required: Recipient email address
  "member_list": Member[],    // Required: Array of member objects
  "reply_to": string,         // Required: Reply-to email address
  "agency_name"?: string,     // Optional: Name of the agency
  "subject"?: string          // Optional: Custom email subject
}
```

### Member Object

```typescript
interface Member {
  name: string;           // Required: Member's full name
  amount_due: number;     // Required: Amount owed (must be >= 0)
  days_late?: number;     // Optional: Number of days payment is late
  member_id?: string;     // Optional: Member ID for reference
}
```

## Example Request

```typescript
const response = await fetch(
  'https://<your-project-ref>.supabase.co/functions/v1/send-batch-email',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      agent_email: 'agent@abccollections.com',
      reply_to: 'support@carynops.com',
      agency_name: 'ABC Collections',
      subject: 'Weekly Delinquent Members Report',
      member_list: [
        {
          name: 'John Doe',
          amount_due: 1250.50,
          days_late: 45,
          member_id: 'M12345'
        },
        {
          name: 'Jane Smith',
          amount_due: 3500.00,
          days_late: 67,
          member_id: 'M12346'
        }
      ]
    })
  }
);

const result = await response.json();
console.log(result);
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Email sent successfully",
  "email_id": "resend-email-id-here",
  "recipient": "agent@abccollections.com",
  "member_count": 2,
  "total_amount": 4750.50
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "error": "Missing required field: agent_email"
}
```

```json
{
  "error": "Invalid email format: agent_email"
}
```

```json
{
  "error": "Each member must have a valid amount_due (non-negative number)"
}
```

#### 500 - Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

## Email Template Features

The generated HTML email includes:

### 1. Professional Header
- Dark background with white text
- Agency name display (if provided)

### 2. Summary Section
- Total member count
- Total amount due (highlighted in red)
- Clean, card-based layout

### 3. Members Table
- Member name and ID
- Amount due (currency formatted)
- Days late with color-coded badges:
  - **Red** (> 60 days): Critical
  - **Yellow** (30-60 days): Warning
  - **Gray** (< 30 days): Normal
- Alternating row colors for readability

### 4. Footer
- Call-to-action text
- Timestamp of report generation
- Branding information

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
supabase link --project-ref <your-project-ref>
```

### 4. Set Environment Variables

Set the Resend API key as a secret:

```bash
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
```

To get your Resend API key:
1. Sign up at [resend.com](https://resend.com)
2. Create an API key in your dashboard
3. Verify your domain (or use resend's test domain for development)

### 5. Deploy the Function

```bash
supabase functions deploy send-batch-email
```

## Local Development

### 1. Start Supabase Locally

```bash
supabase start
```

### 2. Create .env File

Create `supabase/.env.local`:

```bash
RESEND_API_KEY=your_test_api_key_here
```

### 3. Serve Function Locally

```bash
supabase functions serve send-batch-email --env-file supabase/.env.local
```

### 4. Test Locally

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json' \
  --data '{
    "agent_email": "test@example.com",
    "reply_to": "support@carynops.com",
    "member_list": [
      {
        "name": "John Doe",
        "amount_due": 1250.50,
        "days_late": 45
      }
    ]
  }'
```

## Integration with Frontend

### React/TypeScript Example

```typescript
import { supabase } from '@/lib/supabaseClient';

interface Member {
  name: string;
  amount_due: number;
  days_late?: number;
  member_id?: string;
}

async function sendBatchEmail(
  agentEmail: string,
  members: Member[],
  replyTo: string,
  agencyName?: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-batch-email', {
      body: {
        agent_email: agentEmail,
        member_list: members,
        reply_to: replyTo,
        agency_name: agencyName,
      },
    });

    if (error) {
      throw error;
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Usage
const members = [
  { name: 'John Doe', amount_due: 1250.50, days_late: 45, member_id: 'M12345' },
  { name: 'Jane Smith', amount_due: 3500.00, days_late: 67, member_id: 'M12346' },
];

await sendBatchEmail(
  'agent@abccollections.com',
  members,
  'support@carynops.com',
  'ABC Collections'
);
```

## Validation Rules

The function validates:

1. **Required Fields**
   - `agent_email` must be present
   - `member_list` must be a non-empty array
   - `reply_to` must be present

2. **Email Format**
   - Both `agent_email` and `reply_to` must be valid email addresses

3. **Member Data**
   - Each member must have a `name` (string)
   - Each member must have an `amount_due` (non-negative number)
   - Optional fields are validated if present

## Error Handling

The function includes comprehensive error handling:

- Input validation with specific error messages
- Resend API error forwarding
- Detailed logging for debugging
- Graceful failure with appropriate HTTP status codes

## Rate Limits

Be aware of Resend API rate limits:
- Free tier: 100 emails/day
- Paid tiers: Higher limits based on plan

Consider implementing:
- Queue system for large batches
- Rate limiting in your application
- Batch processing with delays

## Security Considerations

1. **API Key Protection**
   - Never expose your Resend API key in client code
   - Use Supabase secrets for secure storage

2. **Email Validation**
   - Function validates email formats
   - Consider additional spam protection

3. **CORS Configuration**
   - Current configuration allows all origins (`*`)
   - Update `_shared/cors.ts` to restrict origins in production

4. **Authentication**
   - Use Supabase Row Level Security (RLS)
   - Implement proper authorization checks
   - Consider rate limiting per user

## Monitoring

Monitor function execution:

```bash
# View function logs
supabase functions logs send-batch-email

# View real-time logs
supabase functions logs send-batch-email --follow
```

## Customization

### Modify Email Template

Edit the `generateEmailHTML` function in `index.ts` to:
- Change colors and styling
- Add/remove sections
- Customize layout
- Add company logos
- Include additional data

### Change "From" Address

Update the `from` field in the Resend API call:

```typescript
from: 'Your Name <noreply@yourdomain.com>'
```

**Note:** You must verify the domain in Resend before using it.

## Troubleshooting

### Email Not Sending

1. Check Resend API key is set correctly
2. Verify domain is verified in Resend
3. Check function logs for errors
4. Ensure email format is valid

### Function Timeout

- Default timeout: 60 seconds
- For large batches, consider splitting into multiple requests
- Process emails asynchronously if needed

### CORS Errors

- Ensure CORS headers are properly configured
- Check browser console for specific CORS issues
- Update allowed origins in production

## Cost Considerations

- **Supabase**: Edge Functions are free up to 500K invocations/month
- **Resend**: Free tier includes 3,000 emails/month
- Monitor usage in both dashboards

## Support

For issues:
1. Check function logs: `supabase functions logs send-batch-email`
2. Verify Resend dashboard for delivery status
3. Review request/response in browser DevTools
4. Check Supabase project logs

## License

This function is part of the Caryn Ops project.
