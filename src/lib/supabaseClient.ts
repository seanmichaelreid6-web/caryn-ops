import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tvzzoocqsbkopddzowcu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enpvb2Nxc2Jrb3BkZHpvd2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjc0OTEsImV4cCI6MjA4NTk0MzQ5MX0.5MjV50lTvzdVpSCTZnE_Xcu-bJWdA0v4kS4LUVWl9go';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
