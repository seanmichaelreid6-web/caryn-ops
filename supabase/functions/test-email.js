/**
 * Test script for send-batch-email Edge Function
 * Usage: node test-email.js
 */

// Configuration
const FUNCTION_URL = 'https://tvzzoocqsbkopddzowcu.supabase.co/functions/v1/send-batch-email';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enpvb2Nxc2Jrb3BkZHpvd2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjc0OTEsImV4cCI6MjA4NTk0MzQ5MX0.5MjV50lTvzdVpSCTZnE_Xcu-bJWdA0v4kS4LUVWl9go';

// Test payload
const payload = {
  agent_email: 'seanmichaelreid6@gmail.com',
  reply_to: 'scott.thomas@carynhealth.com',
  member_list: [
    {
      name: 'Test Member',
      amount_due: 100,
      days_late: 30
    }
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

/**
 * Send test email
 */
async function testSendEmail() {
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}Testing send-batch-email Edge Function${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  console.log(`${colors.yellow}Endpoint:${colors.reset} ${FUNCTION_URL}`);
  console.log(`${colors.yellow}Recipient:${colors.reset} ${payload.agent_email}`);
  console.log(`${colors.yellow}Reply-To:${colors.reset} ${payload.reply_to}\n`);

  console.log(`${colors.cyan}Sending request...${colors.reset}\n`);

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓ SUCCESS (HTTP ${response.status})${colors.reset}\n`);
      console.log(`${colors.green}Response:${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n${colors.green}Email sent successfully!${colors.reset}`);
      console.log(`${colors.yellow}Email ID:${colors.reset} ${data.email_id}`);
      console.log(`${colors.yellow}Recipient:${colors.reset} ${data.recipient}`);
      console.log(`${colors.yellow}Member Count:${colors.reset} ${data.member_count}`);
      console.log(`${colors.yellow}Total Amount:${colors.reset} $${data.total_amount}`);
    } else {
      console.log(`${colors.red}✗ FAILED (HTTP ${response.status})${colors.reset}\n`);
      console.log(`${colors.red}Error Response:${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset}\n`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    console.error(error);
  }

  console.log(`\n${colors.cyan}========================================${colors.reset}`);
}

/**
 * Run multiple test scenarios
 */
async function runAllTests() {
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}Running All Test Scenarios${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  // Test 1: Valid request with single member
  console.log(`${colors.yellow}Test 1: Valid request with single member${colors.reset}`);
  await testSendEmail();
  await delay(2000);

  // Test 2: Multiple members
  console.log(`\n\n${colors.yellow}Test 2: Multiple members${colors.reset}`);
  const multiMemberPayload = {
    agent_email: 'sean.reid@carynhealth.com',
    reply_to: 'scott.thomas@carynhealth.com',
    agency_name: 'Caryn Health Collections',
    subject: 'Test Email - Multiple Members',
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
      },
      {
        name: 'Bob Johnson',
        amount_due: 750.25,
        days_late: 30,
        member_id: 'M12347'
      }
    ]
  };

  await testWithPayload(multiMemberPayload);
  await delay(2000);

  // Test 3: Missing required field (should fail)
  console.log(`\n\n${colors.yellow}Test 3: Missing required field (should fail)${colors.reset}`);
  const invalidPayload = {
    reply_to: 'scott.thomas@carynhealth.com',
    member_list: [{ name: 'Test', amount_due: 100 }]
  };

  await testWithPayload(invalidPayload);

  console.log(`\n${colors.cyan}All tests complete!${colors.reset}`);
}

/**
 * Test with custom payload
 */
async function testWithPayload(customPayload) {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(customPayload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓ SUCCESS (HTTP ${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${colors.red}✗ FAILED (HTTP ${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
  }
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    await runAllTests();
  } else {
    await testSendEmail();
  }
}

// Run the script
main().catch(console.error);
