-- Caryn Ops - Delinquent Member Tracking System
-- Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: agencies
-- Description: Stores agency information and contact details
-- =====================================================
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    agent_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    CONSTRAINT agencies_name_unique UNIQUE (name),
    CONSTRAINT agencies_agent_email_check CHECK (agent_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- Table: uploads
-- Description: Tracks file uploads for member data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    file_size INTEGER,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    CONSTRAINT uploads_filename_check CHECK (LENGTH(filename) > 0)
);

-- =====================================================
-- Table: members
-- Description: Stores delinquent member information
-- =====================================================
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    days_late INTEGER NOT NULL DEFAULT 0,
    agency_id UUID NOT NULL,
    upload_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    member_id TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    CONSTRAINT members_agency_id_fk FOREIGN KEY (agency_id)
        REFERENCES public.agencies(id) ON DELETE CASCADE,
    CONSTRAINT members_upload_id_fk FOREIGN KEY (upload_id)
        REFERENCES public.uploads(id) ON DELETE CASCADE,
    CONSTRAINT members_amount_due_check CHECK (amount_due >= 0),
    CONSTRAINT members_days_late_check CHECK (days_late >= 0),
    CONSTRAINT members_status_check CHECK (status IN ('pending', 'contacted', 'resolved', 'escalated', 'failed'))
);

-- =====================================================
-- Table: outreach_batches
-- Description: Tracks outreach campaigns sent to agencies
-- =====================================================
CREATE TABLE IF NOT EXISTS public.outreach_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    member_count INTEGER DEFAULT 0,
    email_subject TEXT,
    email_body TEXT,
    sent_by TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    CONSTRAINT outreach_batches_agency_id_fk FOREIGN KEY (agency_id)
        REFERENCES public.agencies(id) ON DELETE CASCADE,
    CONSTRAINT outreach_batches_status_check CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT outreach_batches_member_count_check CHECK (member_count >= 0)
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Agencies indexes
CREATE INDEX IF NOT EXISTS idx_agencies_name ON public.agencies(name);
CREATE INDEX IF NOT EXISTS idx_agencies_agent_email ON public.agencies(agent_email);

-- Uploads indexes
CREATE INDEX IF NOT EXISTS idx_uploads_date ON public.uploads(date DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at DESC);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_agency_id ON public.members(agency_id);
CREATE INDEX IF NOT EXISTS idx_members_upload_id ON public.members(upload_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_days_late ON public.members(days_late DESC);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);

-- Outreach batches indexes
CREATE INDEX IF NOT EXISTS idx_outreach_batches_agency_id ON public.outreach_batches(agency_id);
CREATE INDEX IF NOT EXISTS idx_outreach_batches_status ON public.outreach_batches(status);
CREATE INDEX IF NOT EXISTS idx_outreach_batches_sent_at ON public.outreach_batches(sent_at DESC);

-- =====================================================
-- Trigger: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER set_updated_at_agencies
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_members
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- Row Level Security (RLS) Configuration
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_batches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies: Public Read Access (Development Mode)
-- =====================================================

-- Agencies policies
CREATE POLICY "Allow public read access on agencies"
    ON public.agencies
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on agencies"
    ON public.agencies
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on agencies"
    ON public.agencies
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on agencies"
    ON public.agencies
    FOR DELETE
    USING (true);

-- Uploads policies
CREATE POLICY "Allow public read access on uploads"
    ON public.uploads
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on uploads"
    ON public.uploads
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on uploads"
    ON public.uploads
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on uploads"
    ON public.uploads
    FOR DELETE
    USING (true);

-- Members policies
CREATE POLICY "Allow public read access on members"
    ON public.members
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on members"
    ON public.members
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on members"
    ON public.members
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on members"
    ON public.members
    FOR DELETE
    USING (true);

-- Outreach batches policies
CREATE POLICY "Allow public read access on outreach_batches"
    ON public.outreach_batches
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on outreach_batches"
    ON public.outreach_batches
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on outreach_batches"
    ON public.outreach_batches
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on outreach_batches"
    ON public.outreach_batches
    FOR DELETE
    USING (true);

-- =====================================================
-- Views: Useful queries for the application
-- =====================================================

-- View: Members with agency and upload details
CREATE OR REPLACE VIEW public.members_detailed AS
SELECT
    m.id,
    m.name,
    m.member_id,
    m.amount_due,
    m.days_late,
    m.status,
    m.phone,
    m.email,
    m.notes,
    m.created_at,
    m.updated_at,
    a.id AS agency_id,
    a.name AS agency_name,
    a.agent_email,
    u.id AS upload_id,
    u.filename AS upload_filename,
    u.date AS upload_date
FROM public.members m
INNER JOIN public.agencies a ON m.agency_id = a.id
INNER JOIN public.uploads u ON m.upload_id = u.id;

-- View: Agency statistics
CREATE OR REPLACE VIEW public.agency_statistics AS
SELECT
    a.id,
    a.name,
    a.agent_email,
    COUNT(m.id) AS total_members,
    COUNT(CASE WHEN m.status = 'pending' THEN 1 END) AS pending_count,
    COUNT(CASE WHEN m.status = 'contacted' THEN 1 END) AS contacted_count,
    COUNT(CASE WHEN m.status = 'resolved' THEN 1 END) AS resolved_count,
    SUM(m.amount_due) AS total_amount_due,
    AVG(m.days_late) AS avg_days_late,
    MAX(m.days_late) AS max_days_late
FROM public.agencies a
LEFT JOIN public.members m ON a.id = m.agency_id
GROUP BY a.id, a.name, a.agent_email;

-- View: Recent outreach activity
CREATE OR REPLACE VIEW public.recent_outreach AS
SELECT
    ob.id,
    ob.sent_at,
    ob.status,
    ob.member_count,
    ob.email_subject,
    a.name AS agency_name,
    a.agent_email
FROM public.outreach_batches ob
INNER JOIN public.agencies a ON ob.agency_id = a.id
ORDER BY ob.sent_at DESC;

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample data

-- INSERT INTO public.agencies (name, agent_email) VALUES
--     ('ABC Collections', 'agent@abccollections.com'),
--     ('XYZ Recovery', 'contact@xyzrecovery.com');

-- INSERT INTO public.uploads (filename, date) VALUES
--     ('delinquent_members_2024_01.csv', '2024-01-15'),
--     ('delinquent_members_2024_02.csv', '2024-02-15');

-- =====================================================
-- Comments on Tables
-- =====================================================

COMMENT ON TABLE public.agencies IS 'Stores collection agency information and contact details';
COMMENT ON TABLE public.uploads IS 'Tracks file uploads containing member delinquency data';
COMMENT ON TABLE public.members IS 'Stores individual delinquent member records with status tracking';
COMMENT ON TABLE public.outreach_batches IS 'Tracks bulk outreach campaigns sent to collection agencies';

COMMENT ON VIEW public.members_detailed IS 'Enriched view of members with agency and upload information';
COMMENT ON VIEW public.agency_statistics IS 'Aggregated statistics for each agency';
COMMENT ON VIEW public.recent_outreach IS 'Recent outreach activity with agency details';
