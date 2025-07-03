-- Artis Laminates Database Schema
-- Generated for Supabase import

CREATE TABLE public."Attendance" (
    id uuid NOT NULL,
    "salesTeamId" uuid NOT NULL,
    date date NOT NULL,
    location jsonb NOT NULL,
    status public."enum_Attendance_status" DEFAULT 'PRESENT'::public."enum_Attendance_status" NOT NULL,
    "checkInTime" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);
CREATE TABLE public."Attendances" (
    id uuid NOT NULL,
    "salesTeamId" uuid NOT NULL,
    date date NOT NULL,
    location json NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    status public."enum_Attendances_status" DEFAULT 'PRESENT'::public."enum_Attendances_status" NOT NULL
);
CREATE TABLE public."DealerVisits" (
    id uuid NOT NULL,
    "salesTeamId" uuid NOT NULL,
    location json NOT NULL,
    "visitDate" timestamp with time zone NOT NULL,
    "photoUrl" character varying(255),
    notes text,
    "isOfflineEntry" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "offlineId" character varying(255),
    "syncedAt" timestamp with time zone,
    "dealerNames" character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
    sales json DEFAULT '{"liner":0,"artvio08":0,"woodrica08":0,"artis1":0}'::json NOT NULL
);
CREATE TABLE public."Leads" (
    status public."enum_Leads_status" DEFAULT 'NEW'::public."enum_Leads_status" NOT NULL,
    notes text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "customerName" character varying(255) NOT NULL,
    "phoneNumber" character varying(255) NOT NULL,
    "enquiryDetails" text NOT NULL,
    "assignedTo" uuid NOT NULL,
    "assignedBy" uuid NOT NULL,
    location character varying(255) NOT NULL,
    "notesHistory" jsonb DEFAULT '[]'::jsonb NOT NULL,
    id uuid NOT NULL
);
CREATE TABLE public."Messages" (
    id uuid NOT NULL,
    "senderId" uuid NOT NULL,
    "receiverId" uuid NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);
CREATE TABLE public."Products" (
    id uuid NOT NULL,
    name character varying(255),
    "supplierCode" character varying(255) NOT NULL,
    supplier character varying(255) NOT NULL,
    category character varying(255),
    gsm character varying(255),
    texture character varying(255),
    thickness character varying(255),
    catalogs character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[] NOT NULL,
    "currentStock" numeric(10,2) DEFAULT 0 NOT NULL,
    "avgConsumption" numeric(10,2) DEFAULT 0 NOT NULL,
    "lastUpdated" timestamp with time zone NOT NULL,
    "minStockLevel" numeric(10,2),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "artisCodes" character varying(255)[] NOT NULL
);
CREATE TABLE public."SalesTeams" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    role public."enum_SalesTeams_role" NOT NULL,
    territory character varying(255),
    "reportingTo" uuid,
    "targetQuarter" integer,
    "targetYear" integer,
    "targetAmount" numeric(10,2),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);
CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);
CREATE TABLE public."Transactions" (
    id uuid NOT NULL,
    "productId" uuid NOT NULL,
    type public."enum_Transactions_type" NOT NULL,
    quantity numeric(10,2) NOT NULL,
    date timestamp with time zone NOT NULL,
    notes character varying(255),
    "includeInAvg" boolean DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "operationId" character varying(255)
);
CREATE TABLE public."Users" (
    id uuid NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role public."enum_Users_role" DEFAULT 'user'::public."enum_Users_role",
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "firstName" character varying(255) NOT NULL,
    "lastName" character varying(255) NOT NULL,
    "phoneNumber" character varying(255) NOT NULL
);
CREATE TABLE public.distributors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    state character varying(255) NOT NULL,
    "phoneNumber" character varying(255) NOT NULL,
    catalogs character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    latitude double precision,
    longitude double precision,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

-- Constraints and Indexes
CREATE INDEX attendance_date ON public."Attendance" USING btree (date);
CREATE INDEX attendance_sales_team_id ON public."Attendance" USING btree ("salesTeamId");
CREATE INDEX attendance_status ON public."Attendance" USING btree (status);
CREATE UNIQUE INDEX attendances_sales_team_id_date ON public."Attendances" USING btree ("salesTeamId", date);
CREATE INDEX dealer_visits_is_offline_entry_synced_at ON public."DealerVisits" USING btree ("isOfflineEntry", "syncedAt");
CREATE UNIQUE INDEX dealer_visits_offline_id ON public."DealerVisits" USING btree ("offlineId") WHERE ("offlineId" IS NOT NULL);
CREATE INDEX dealer_visits_sales_team_id ON public."DealerVisits" USING btree ("salesTeamId");
CREATE INDEX dealer_visits_sales_team_id_visit_date ON public."DealerVisits" USING btree ("salesTeamId", "visitDate");
CREATE INDEX dealer_visits_visit_date ON public."DealerVisits" USING btree ("visitDate");
CREATE INDEX messages_created_at ON public."Messages" USING btree ("createdAt");
CREATE INDEX messages_is_read ON public."Messages" USING btree ("isRead");
CREATE INDEX messages_receiver_id ON public."Messages" USING btree ("receiverId");
CREATE INDEX messages_sender_id ON public."Messages" USING btree ("senderId");

-- Sample data insert (distributors table had 57 records)
-- You'll need to import the full data separately
