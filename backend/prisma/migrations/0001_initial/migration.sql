-- CreateTable colleges
CREATE TABLE IF NOT EXISTS "colleges" (
    "id" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(120),
    "code" VARCHAR(50),
    "domain" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable students
CREATE TABLE IF NOT EXISTS "students" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "department" VARCHAR(80),
    "year" INTEGER,
    "roll_number" VARCHAR(40),
    "phone" VARCHAR(20),
    "bio" TEXT,
    "headline" VARCHAR(255),
    "location" VARCHAR(255),
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "resume_url" TEXT,
    "profile_photo" TEXT,
    "skills" TEXT,
    "profile_links" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable alumni
CREATE TABLE IF NOT EXISTS "alumni" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "department" VARCHAR(80),
    "graduation_year" INTEGER,
    "company" VARCHAR(120),
    "designation" VARCHAR(120),
    "phone" VARCHAR(20),
    "bio" TEXT,
    "headline" VARCHAR(255),
    "location" VARCHAR(120),
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "profile_photo" TEXT,
    "skills" TEXT,
    "profile_links" JSONB NOT NULL DEFAULT '[]',
    "available_mentorship" BOOLEAN NOT NULL DEFAULT false,
    "available_referral" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

-- CreateTable admins
CREATE TABLE IF NOT EXISTS "admins" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80),
    "full_name" VARCHAR(120) NOT NULL,
    "username" VARCHAR(80),
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable education_history
CREATE TABLE IF NOT EXISTS "education_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_role" VARCHAR(20) NOT NULL,
    "college_id" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(255) NOT NULL,
    "degree" VARCHAR(255),
    "field_of_study" VARCHAR(255),
    "start_year" INTEGER,
    "end_year" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "education_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable career_timeline
CREATE TABLE IF NOT EXISTS "career_timeline" (
    "id" SERIAL NOT NULL,
    "alumni_id" INTEGER NOT NULL,
    "college_id" VARCHAR(100) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "career_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable opportunities
CREATE TABLE IF NOT EXISTS "opportunities" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "alumni_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "company" VARCHAR(120),
    "description" TEXT,
    "job_type" VARCHAR(40),
    "location" VARCHAR(120),
    "skills_required" TEXT,
    "salary" VARCHAR(80),
    "apply_link" TEXT,
    "deadline" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "openings_count" INTEGER NOT NULL DEFAULT 1,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "target_colleges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable job_applications
CREATE TABLE IF NOT EXISTS "job_applications" (
    "id" SERIAL NOT NULL,
    "opportunity_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "cover_letter" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable events
CREATE TABLE IF NOT EXISTS "events" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "admin_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "event_type" VARCHAR(60),
    "organizer" VARCHAR(120),
    "speaker" VARCHAR(120),
    "location" VARCHAR(200),
    "event_date" TIMESTAMPTZ,
    "time_slot" VARCHAR(50),
    "max_capacity" INTEGER,
    "banner_url" TEXT,
    "registration_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "target_colleges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable event_registrations
CREATE TABLE IF NOT EXISTS "event_registrations" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "participant_type" VARCHAR(10) NOT NULL DEFAULT 'student',
    "student_id" INTEGER,
    "college_id" VARCHAR(80) NOT NULL,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentorship_requests
CREATE TABLE IF NOT EXISTS "mentorship_requests" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "alumni_id" INTEGER NOT NULL,
    "college_id" VARCHAR(100) NOT NULL,
    "is_cross_college" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "response" TEXT,
    "response_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mentorship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable referral_requests
CREATE TABLE IF NOT EXISTS "referral_requests" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "alumni_id" INTEGER NOT NULL,
    "college_id" VARCHAR(100) NOT NULL,
    "is_cross_college" BOOLEAN NOT NULL DEFAULT false,
    "company" VARCHAR(255) NOT NULL,
    "job_title" VARCHAR(255) NOT NULL,
    "resume_url" TEXT,
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable connection_requests
CREATE TABLE IF NOT EXISTS "connection_requests" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "requester_type" VARCHAR(20) NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "recipient_type" VARCHAR(20) NOT NULL,
    "college_id" VARCHAR(100),
    "is_cross_college" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "responded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80),
    "is_cross_college" BOOLEAN NOT NULL DEFAULT false,
    "is_intro_only" BOOLEAN NOT NULL DEFAULT false,
    "user1_id" INTEGER,
    "user1_type" VARCHAR(10),
    "user2_id" INTEGER,
    "user2_type" VARCHAR(10),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable conversation_participants
CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "participant_type" VARCHAR(10) NOT NULL,
    "last_read_at" TIMESTAMPTZ,
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_type" VARCHAR(10) NOT NULL,
    "message" TEXT NOT NULL,
    "college_id" VARCHAR(80),
    "is_cross_college" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_type" VARCHAR(20) NOT NULL,
    "college_id" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) DEFAULT 'general',
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable announcements
CREATE TABLE IF NOT EXISTS "announcements" (
    "id" SERIAL NOT NULL,
    "college_id" VARCHAR(80) NOT NULL,
    "admin_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "posted_by" VARCHAR(120),
    "target_role" VARCHAR(20) NOT NULL DEFAULT 'all',
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "target_colleges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_batches" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
ALTER TABLE "students" ADD CONSTRAINT "students_email_college_id_key" UNIQUE ("email", "college_id");
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_email_college_id_key" UNIQUE ("email", "college_id");
ALTER TABLE "admins" ADD CONSTRAINT "admins_email_key" UNIQUE ("email");
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_opportunity_id_student_id_key" UNIQUE ("opportunity_id", "student_id");
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_unique" UNIQUE ("event_id", "participant_id", "participant_type");
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_requester_recipient_key" UNIQUE ("requester_id", "requester_type", "recipient_id", "recipient_type");
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_unique" UNIQUE ("conversation_id", "participant_id", "participant_type");

-- Indexes
CREATE INDEX IF NOT EXISTS "students_college_id_year_idx" ON "students"("college_id", "year");
CREATE INDEX IF NOT EXISTS "alumni_college_id_graduation_year_idx" ON "alumni"("college_id", "graduation_year");
CREATE INDEX IF NOT EXISTS "alumni_company_idx" ON "alumni"("company");
CREATE INDEX IF NOT EXISTS "alumni_department_idx" ON "alumni"("department");
CREATE INDEX IF NOT EXISTS "education_history_user_idx" ON "education_history"("user_id", "user_role", "college_id");
CREATE INDEX IF NOT EXISTS "career_timeline_alumni_idx" ON "career_timeline"("alumni_id", "college_id");
CREATE INDEX IF NOT EXISTS "mentorship_requests_student_idx" ON "mentorship_requests"("student_id", "college_id");
CREATE INDEX IF NOT EXISTS "mentorship_requests_alumni_idx" ON "mentorship_requests"("alumni_id");
CREATE INDEX IF NOT EXISTS "referral_requests_student_idx" ON "referral_requests"("student_id", "college_id");
CREATE INDEX IF NOT EXISTS "referral_requests_alumni_idx" ON "referral_requests"("alumni_id");
CREATE INDEX IF NOT EXISTS "connection_requests_requester_idx" ON "connection_requests"("requester_id", "requester_type");
CREATE INDEX IF NOT EXISTS "connection_requests_recipient_idx" ON "connection_requests"("recipient_id", "recipient_type");
CREATE INDEX IF NOT EXISTS "connection_requests_status_idx" ON "connection_requests"("status");
CREATE INDEX IF NOT EXISTS "connection_requests_college_idx" ON "connection_requests"("college_id");
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications"("user_id", "user_type", "college_id", "is_read");

-- Foreign Keys
ALTER TABLE "students" ADD CONSTRAINT "students_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admins" ADD CONSTRAINT "admins_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "career_timeline" ADD CONSTRAINT "career_timeline_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
