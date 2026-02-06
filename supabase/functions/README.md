# Supabase Edge Functions

This directory contains serverless Edge Functions for the Caryn Ops project.

## Available Functions

### 1. send-batch-email

Sends professionally formatted HTML emails with delinquent member information to collection agencies via the Resend API.

**Location:** `send-batch-email/`

**Key Features:**
- HTML email template with member tables
- Color-coded severity indicators
- Currency formatting
- Summary statistics
- Dynamic reply-to headers
- Comprehensive validation

**Documentation:** See [send-batch-email/README.md](./send-batch-email/README.md)

## Project Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── cors.ts              # CORS configuration
│   ├── send-batch-email/
│   │   ├── index.ts             # Main function code
│   │   ├── README.md            # Function documentation
│   │   └── test-payload.json   # Sample test data
│   ├── test-email.sh            # Test script
│   ├── DEPLOYMENT.md            # Deployment guide
│   └── README.md                # This file
├── schema.sql                   # Database schema
└── .env.example                 # Environment variables template
```

## Quick Start

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Get a Resend API key:
   - Sign up at [resend.com](https://resend.com)
   - Create an API key
   - Verify your domain

### Setup

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link to Your Project**
   ```bash
   cd caryn-ops
   supabase link --project-ref <your-project-ref>
   ```

3. **Set Environment Variables**
   ```bash
   # For production
   supabase secrets set RESEND_API_KEY=<your-resend-api-key>

   # For local development
   cp supabase/.env.example supabase/.env.local
   # Edit .env.local with your keys
   ```

4. **Deploy Functions**
   ```bash
   supabase functions deploy send-batch-email
   ```

### Local Development

1. **Start Supabase**
   ```bash
   supabase start
   ```

2. **Serve Functions**
   ```bash
   supabase functions serve --env-file supabase/.env.local
   ```

3. **Test Function**
   ```bash
   # Make script executable (Unix/Mac)
   chmod +x supabase/functions/test-email.sh

   # Run tests
   ./supabase/functions/test-email.sh local
   ```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.functions.invoke('send-batch-email', {
  body: {
    agent_email: 'agent@agency.com',
    reply_to: 'support@carynops.com',
    agency_name: 'ABC Collections',
    member_list: [
      {
        name: 'John Doe',
        amount_due: 1250.50,
        days_late: 45,
        member_id: 'M12345'
      }
    ]
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

### cURL

```bash
curl -i --location --request POST \
  'https://<project-ref>.supabase.co/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "agent_email": "agent@agency.com",
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

### React Component

```typescript
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

function SendEmailButton({ agency, members }) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-batch-email', {
        body: {
          agent_email: agency.email,
          reply_to: 'support@carynops.com',
          agency_name: agency.name,
          member_list: members
        }
      });

      if (error) throw error;
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <button onClick={handleSend} disabled={sending}>
      {sending ? 'Sending...' : 'Send Email'}
    </button>
  );
}
```

## Testing

### Run Test Suite

```bash
# Test locally
./supabase/functions/test-email.sh local

# Test production
./supabase/functions/test-email.sh prod
```

### Manual Testing

```bash
# Using test payload file
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data @supabase/functions/send-batch-email/test-payload.json
```

## Monitoring

### View Logs

```bash
# Recent logs
supabase functions logs send-batch-email

# Live logs
supabase functions logs send-batch-email --follow

# Logs from last hour
supabase functions logs send-batch-email --since 1h
```

### Check Status

```bash
# List all functions
supabase functions list

# Inspect specific function
supabase functions inspect send-batch-email
```

## Common Tasks

### Update a Function

1. Edit the function code
2. Test locally:
   ```bash
   supabase functions serve send-batch-email --env-file supabase/.env.local
   ```
3. Deploy:
   ```bash
   supabase functions deploy send-batch-email
   ```

### Add a New Function

1. Create function directory:
   ```bash
   mkdir -p supabase/functions/my-function
   ```

2. Create index.ts:
   ```bash
   touch supabase/functions/my-function/index.ts
   ```

3. Add function code (see existing functions for examples)

4. Deploy:
   ```bash
   supabase functions deploy my-function
   ```

### Manage Secrets

```bash
# List secrets
supabase secrets list

# Set a secret
supabase secrets set MY_SECRET=value

# Delete a secret
supabase secrets unset MY_SECRET
```

## Troubleshooting

### Function Returns 404

- Verify function is deployed: `supabase functions list`
- Check URL format: `https://<project-ref>.supabase.co/functions/v1/<function-name>`
- Redeploy: `supabase functions deploy send-batch-email`

### Unauthorized Errors

- Verify anon key is correct
- Check authorization header format: `Bearer <key>`
- Ensure RLS policies allow access

### Email Not Sending

- Check Resend API key: `supabase secrets list`
- Verify domain in Resend dashboard
- Check function logs: `supabase functions logs send-batch-email`
- Test with Resend test domain first

### CORS Errors

- Ensure `_shared/cors.ts` is included
- Check OPTIONS handler in function
- Update allowed origins in production

## Security Best Practices

1. **Never commit secrets**
   - Use `supabase secrets set` for production
   - Use `.env.local` for development (add to .gitignore)

2. **Validate all input**
   - Check email formats
   - Validate data types
   - Sanitize user input

3. **Implement rate limiting**
   - Prevent abuse
   - Protect API quotas

4. **Use Row Level Security (RLS)**
   - Enable on database tables
   - Restrict function access

5. **Restrict CORS origins**
   - Update `_shared/cors.ts` for production
   - Don't use wildcard (`*`) in production

## Cost Considerations

### Supabase Edge Functions
- **Free tier:** 500K invocations/month
- **Pro tier:** 2M invocations/month included
- **Additional:** $2 per 1M invocations

### Resend API
- **Free tier:** 3,000 emails/month
- **Pro tier:** Starts at $20/month for 50,000 emails

### Optimization Tips
- Batch operations where possible
- Implement caching
- Monitor usage dashboards
- Set up billing alerts

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [send-batch-email README](./send-batch-email/README.md) - Function-specific docs
- [Supabase Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Resend API Docs](https://resend.com/docs)

## Support

For issues or questions:
1. Check function logs
2. Review documentation
3. Test locally with debug mode
4. Check Supabase and Resend dashboards

## Contributing

When adding new functions:
1. Follow existing code structure
2. Include comprehensive documentation
3. Add test cases
4. Update this README

## License

Part of the Caryn Ops project.
