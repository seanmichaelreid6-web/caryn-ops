# Supabase Setup Guide

Quick guide to get your Edge Function working.

## Current Status

✅ Edge Function created: `send-batch-email`
✅ Test script created: `test-email.js`
✅ Local `.env.local` configured with Resend API key
❌ Production Supabase secret not set yet

## Issue

The test failed with:
```
HTTP 401 - API key is invalid
```

This means the Resend API key needs to be set in your Supabase project secrets.

## Solution: Set Production Secret

You need to set your Resend API key as a Supabase secret so the deployed Edge Function can use it.

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   cd caryn-ops
   supabase link --project-ref tvzzoocqsbkopddzowcu
   ```

4. **Set the Resend API key**:
   ```bash
   supabase secrets set RESEND_API_KEY=re_fJXrjdGo_86DPfFVP7kbVgrgxLe8zwNBX
   ```

5. **Deploy the function** (if not already deployed):
   ```bash
   supabase functions deploy send-batch-email
   ```

6. **Test again**:
   ```bash
   node supabase/functions/test-email.js
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard:
   https://supabase.com/dashboard/project/tvzzoocqsbkopddzowcu

2. Navigate to **Edge Functions** → **Settings** (or **Project Settings** → **Edge Functions**)

3. Find the **Secrets** section

4. Add a new secret:
   - Key: `RESEND_API_KEY`
   - Value: `re_fJXrjdGo_86DPfFVP7kbVgrgxLe8zwNBX`

5. Save and wait a moment for it to propagate

6. Test again:
   ```bash
   node supabase/functions/test-email.js
   ```

## Testing Options

### Basic Test (Single Member)
```bash
node supabase/functions/test-email.js
```

### Run All Tests (Multiple Scenarios)
```bash
node supabase/functions/test-email.js --all
```

### Edit Test Payload

Open `supabase/functions/test-email.js` and modify the `payload` object to test different scenarios.

## Verifying Resend Setup

Make sure in your Resend dashboard (https://resend.com):

1. **API Key is valid**
   - Check your API Keys section
   - Verify the key hasn't been revoked

2. **Domain is verified** (or use test domain)
   - For production emails, verify your domain
   - For testing, you can use `onboarding@resend.dev` as the from address

3. **Sending limits**
   - Free tier: 3,000 emails/month
   - Check you haven't hit limits

## Expected Successful Response

When working correctly, you should see:

```
✓ SUCCESS (HTTP 200)

Response:
{
  "success": true,
  "message": "Email sent successfully",
  "email_id": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
  "recipient": "sean.reid@carynhealth.com",
  "member_count": 1,
  "total_amount": 100
}

Email sent successfully!
Email ID: abcd1234-5678-90ef-ghij-klmnopqrstuv
Recipient: sean.reid@carynhealth.com
Member Count: 1
Total Amount: $100
```

## Troubleshooting

### 401 Error
- **Cause**: Resend API key not set or invalid
- **Fix**: Set the secret in Supabase (see above)

### 404 Error
- **Cause**: Edge Function not deployed
- **Fix**: Deploy with `supabase functions deploy send-batch-email`

### 500 Error
- **Cause**: Runtime error in function
- **Fix**: Check logs with `supabase functions logs send-batch-email`

### Email Not Received
- **Check Resend dashboard** for delivery status
- **Check spam folder**
- **Verify email address** is correct
- **Check Resend domain verification**

## Project Configuration

Your project details:
- **Project Ref**: `tvzzoocqsbkopddzowcu`
- **Function URL**: `https://tvzzoocqsbkopddzowcu.supabase.co/functions/v1/send-batch-email`
- **Dashboard**: `https://supabase.com/dashboard/project/tvzzoocqsbkopddzowcu`

## Next Steps

1. ✅ Set the Resend API key in Supabase secrets
2. ✅ Test with `node supabase/functions/test-email.js`
3. ✅ Verify email is received in your inbox
4. ✅ Check email formatting looks correct
5. ✅ Integrate into your frontend application

## Frontend Integration

Once the function works, integrate it into your React app:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tvzzoocqsbkopddzowcu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// Send email
const { data, error } = await supabase.functions.invoke('send-batch-email', {
  body: {
    agent_email: 'agent@agency.com',
    reply_to: 'support@carynhealth.com',
    agency_name: 'Agency Name',
    member_list: members
  }
});

if (error) {
  console.error('Failed to send email:', error);
} else {
  console.log('Email sent:', data);
}
```

## Support

If you continue to have issues:
1. Check Supabase function logs: `supabase functions logs send-batch-email`
2. Check Resend dashboard for API errors
3. Verify both API keys are correct
4. Try deploying the function again

## Security Notes

- ✅ `.env.local` is gitignored (local development only)
- ✅ Production secrets stored securely in Supabase
- ✅ API keys never exposed in frontend code
- ✅ CORS configured for your domain
