# Supabase Edge Functions Deployment Guide

Complete guide for deploying and managing Edge Functions for the Caryn Ops project.

## Prerequisites

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **Supabase Account** with a project created
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

3. **Resend Account** for email sending
   - Sign up at [resend.com](https://resend.com)
   - Get your API key
   - Verify a domain (or use test domain)

## Initial Setup

### 1. Login to Supabase

```bash
supabase login
```

This opens your browser for authentication.

### 2. Link to Your Project

```bash
# Navigate to your project root
cd caryn-ops

# Link to your Supabase project
supabase link --project-ref <your-project-ref>
```

You can find your project ref in the Supabase dashboard URL:
`https://app.supabase.com/project/<your-project-ref>`

### 3. Set Up Environment Variables

#### Production Secrets

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=<your-resend-api-key>

# Verify secrets
supabase secrets list
```

#### Local Development

Create `supabase/.env.local`:

```bash
RESEND_API_KEY=your_test_api_key_here
```

**Important:** Add `.env.local` to `.gitignore`:

```bash
echo "supabase/.env.local" >> .gitignore
```

## Deploying Functions

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy Specific Function

```bash
supabase functions deploy send-batch-email
```

### Deploy with Custom Configuration

```bash
# Deploy with specific import map
supabase functions deploy send-batch-email --import-map supabase/functions/import_map.json

# Deploy without verification
supabase functions deploy send-batch-email --no-verify-jwt
```

## Local Development

### 1. Start Supabase Locally

```bash
# Start all Supabase services
supabase start

# This will output:
# - API URL: http://localhost:54321
# - Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Serve Functions Locally

```bash
# Serve all functions
supabase functions serve --env-file supabase/.env.local

# Serve specific function
supabase functions serve send-batch-email --env-file supabase/.env.local

# With debugging
supabase functions serve send-batch-email --env-file supabase/.env.local --debug
```

### 3. Test Locally

Using curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data @supabase/functions/send-batch-email/test-payload.json
```

Using the test script:

```bash
# Make the script executable
chmod +x supabase/functions/test-email.sh

# Run the test
./supabase/functions/test-email.sh
```

## Testing

### Unit Testing

Create `supabase/functions/send-batch-email/test.ts`:

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('Email validation', () => {
  // Add your tests here
});
```

Run tests:

```bash
deno test supabase/functions/send-batch-email/test.ts
```

### Integration Testing

Test with actual Resend API:

```bash
# Using test payload
curl -i --location --request POST 'https://<your-project-ref>.supabase.co/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer <YOUR_ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data @supabase/functions/send-batch-email/test-payload.json
```

## Monitoring

### View Logs

```bash
# View recent logs
supabase functions logs send-batch-email

# Follow logs in real-time
supabase functions logs send-batch-email --follow

# View logs with specific time range
supabase functions logs send-batch-email --since 1h
```

### Check Function Status

```bash
# List all functions
supabase functions list

# Get function details
supabase functions inspect send-batch-email
```

## Troubleshooting

### Common Issues

#### 1. Function Not Found (404)

**Cause:** Function not deployed or incorrect URL

**Solution:**
```bash
# Redeploy function
supabase functions deploy send-batch-email

# Verify deployment
supabase functions list
```

#### 2. Unauthorized (401)

**Cause:** Missing or invalid API key

**Solution:**
- Ensure you're using the correct anon key
- Check authorization header format: `Bearer <key>`
- Verify JWT settings if using RLS

#### 3. Internal Server Error (500)

**Cause:** Runtime error in function

**Solution:**
```bash
# Check logs
supabase functions logs send-batch-email --limit 50

# Test locally with debug
supabase functions serve send-batch-email --env-file supabase/.env.local --debug
```

#### 4. CORS Errors

**Cause:** CORS headers not properly configured

**Solution:**
- Check `_shared/cors.ts` is included
- Verify OPTIONS method handler is present
- Update allowed origins for production

#### 5. Resend API Errors

**Cause:** Invalid API key or domain not verified

**Solution:**
- Verify API key: `supabase secrets list`
- Check domain verification in Resend dashboard
- Review Resend API error in function logs

## Environment Management

### Development Environment

```bash
# Use .env.local
supabase functions serve --env-file supabase/.env.local
```

### Staging Environment

```bash
# Set staging secrets
supabase secrets set RESEND_API_KEY=<staging-key> --project-ref <staging-ref>
```

### Production Environment

```bash
# Set production secrets
supabase secrets set RESEND_API_KEY=<production-key> --project-ref <production-ref>

# Deploy to production
supabase functions deploy send-batch-email --project-ref <production-ref>
```

## Security Best Practices

### 1. Protect API Keys

- Never commit API keys to version control
- Use Supabase secrets for production
- Use .env.local for development (add to .gitignore)

### 2. Implement Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// In your function
const rateLimiter = new Map();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimiter.get(email) || 0;

  if (now - lastRequest < 60000) { // 1 minute
    return false;
  }

  rateLimiter.set(email, now);
  return true;
}
```

### 3. Validate Input

Always validate and sanitize input:

```typescript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sanitize HTML content
function sanitize(str: string): string {
  return str.replace(/[<>]/g, '');
}
```

### 4. Use Row Level Security (RLS)

Enable RLS on your database tables and use service role key only when necessary.

### 5. Restrict CORS Origins

For production, update `_shared/cors.ts`:

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

## Performance Optimization

### 1. Cold Start Optimization

- Keep function code minimal
- Use lazy imports for large libraries
- Implement caching where appropriate

### 2. Batch Processing

For large email batches:

```typescript
// Process in chunks
async function processBatch(items: any[], chunkSize: number) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(processItem));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}
```

### 3. Error Recovery

Implement retry logic:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}
```

## Updating Functions

### 1. Make Changes

Edit function code in `supabase/functions/send-batch-email/index.ts`

### 2. Test Locally

```bash
supabase functions serve send-batch-email --env-file supabase/.env.local
```

### 3. Deploy Update

```bash
supabase functions deploy send-batch-email
```

### 4. Verify Deployment

```bash
# Check logs
supabase functions logs send-batch-email --follow

# Test in production (with caution)
curl -i --location --request POST 'https://<your-project-ref>.supabase.co/functions/v1/send-batch-email' \
  --header 'Authorization: Bearer <YOUR_ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"agent_email":"test@example.com","reply_to":"support@example.com","member_list":[{"name":"Test","amount_due":100}]}'
```

## Rolling Back

If deployment fails or causes issues:

```bash
# View deployment history
supabase functions list

# If needed, redeploy previous version
git checkout <previous-commit>
supabase functions deploy send-batch-email
```

## Cost Management

### Supabase Edge Functions Pricing

- Free tier: 500K invocations/month
- Pro tier: 2M invocations/month included
- Additional: $2 per 1M invocations

### Resend Pricing

- Free tier: 3,000 emails/month
- Pro tier: Starts at $20/month for 50,000 emails

### Optimization Tips

1. Batch emails where possible
2. Implement caching for repeated operations
3. Monitor usage in dashboards
4. Set up alerts for usage thresholds

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        run: npm install -g supabase

      - name: Deploy Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_REF: ${{ secrets.PROJECT_REF }}
        run: |
          supabase functions deploy send-batch-email --project-ref $PROJECT_REF
```

## Support Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Project Issues](https://github.com/your-repo/issues)
