-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "workspace_role" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "customer_gender" AS ENUM ('male', 'female', 'non-binary');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('complete', 'pending', 'cancelled');

-- CreateEnum
CREATE TYPE "schedule_kind" AS ENUM ('event', 'reminder', 'task');

-- CreateEnum
CREATE TYPE "task_category" AS ENUM ('design', 'development', 'research');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('todo', 'doing', 'done');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "display_name" VARCHAR(80),
    "phone" VARCHAR(30),
    "birth_date" DATE,
    "bio" VARCHAR(500),
    "tax_id" VARCHAR(20),
    "avatar_url" VARCHAR(2048),
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
    "date_format" VARCHAR(30) NOT NULL DEFAULT 'MM/dd/yyyy',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "compact_sidebar" BOOLEAN NOT NULL DEFAULT false,
    "task_notifications" BOOLEAN NOT NULL DEFAULT true,
    "invoice_notifications" BOOLEAN NOT NULL DEFAULT true,
    "event_notifications" BOOLEAN NOT NULL DEFAULT true,
    "customer_notifications" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "user_agent" VARCHAR(500),
    "ip_address" INET,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "workspace_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "gender" "customer_gender" NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "performance" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "satisfaction" INTEGER NOT NULL DEFAULT 0,
    "retention" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(7) NOT NULL DEFAULT '#625df5',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "sku" VARCHAR(80),
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "price" DECIMAL(12,2) NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "customer_id" UUID,
    "number" VARCHAR(40) NOT NULL,
    "customer_name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "address" VARCHAR(300),
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "due_at" TIMESTAMPTZ(3),
    "status" "invoice_status" NOT NULL DEFAULT 'pending',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "description" VARCHAR(300) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "category" "task_category" NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'todo',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "task_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("task_id","member_id")
);

-- CreateTable
CREATE TABLE "schedule_entries" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "location" VARCHAR(200),
    "kind" "schedule_kind" NOT NULL DEFAULT 'event',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_attendees" (
    "schedule_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "schedule_attendees_pkey" PRIMARY KEY ("schedule_id","member_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_tax_id_key" ON "users"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "customers_workspace_id_last_name_first_name_idx" ON "customers"("workspace_id", "last_name", "first_name");

-- CreateIndex
CREATE INDEX "customers_created_by_id_idx" ON "customers"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspace_id_email_key" ON "customers"("workspace_id", "email");

-- CreateIndex
CREATE INDEX "products_workspace_id_name_idx" ON "products"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "products_created_by_id_idx" ON "products"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_workspace_id_sku_key" ON "products"("workspace_id", "sku");

-- CreateIndex
CREATE INDEX "invoices_workspace_id_status_issued_at_idx" ON "invoices"("workspace_id", "status", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_created_by_id_idx" ON "invoices"("created_by_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_workspace_id_number_key" ON "invoices"("workspace_id", "number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_product_id_idx" ON "invoice_items"("product_id");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_status_due_at_idx" ON "tasks"("workspace_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "tasks_created_by_id_idx" ON "tasks"("created_by_id");

-- CreateIndex
CREATE INDEX "task_assignees_member_id_idx" ON "task_assignees"("member_id");

-- CreateIndex
CREATE INDEX "schedule_entries_workspace_id_starts_at_idx" ON "schedule_entries"("workspace_id", "starts_at");

-- CreateIndex
CREATE INDEX "schedule_entries_organizer_id_idx" ON "schedule_entries"("organizer_id");

-- CreateIndex
CREATE INDEX "schedule_attendees_member_id_idx" ON "schedule_attendees"("member_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_attendees" ADD CONSTRAINT "schedule_attendees_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedule_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_attendees" ADD CONSTRAINT "schedule_attendees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_expiry_check" CHECK ("expires_at" > "created_at");

-- AddCheckConstraint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_expiry_check" CHECK ("expires_at" > "created_at");

-- AddCheckConstraint
ALTER TABLE "customers" ADD CONSTRAINT "customers_satisfaction_range_check" CHECK ("satisfaction" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "customers" ADD CONSTRAINT "customers_retention_range_check" CHECK ("retention" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "products" ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0);

-- AddCheckConstraint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_check" CHECK ("stock" >= 0);

-- AddCheckConstraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_discount_range_check" CHECK ("discount" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amounts_check" CHECK ("subtotal" >= 0 AND "total" >= 0);

-- AddCheckConstraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_due_date_check" CHECK ("due_at" IS NULL OR "due_at" >= "issued_at");

-- AddCheckConstraint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_values_check" CHECK ("unit_price" >= 0 AND "quantity" > 0 AND "amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_date_range_check" CHECK ("due_at" >= "starts_at");

-- AddCheckConstraint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_date_range_check" CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at");
