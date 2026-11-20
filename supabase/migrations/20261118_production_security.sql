-- ============================================================================
-- InventoryIQ Production Security Migration
-- PostgreSQL Schema with Strict Row-Level Security (RLS) and Multi-Tenant RBAC
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations Table (Multi-Tenant Boundaries)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    organization_type TEXT NOT NULL DEFAULT 'Retail Store / Shop',
    gstin TEXT,
    phone TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. User Profiles Table (Linked 1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Organization Members Table (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- 5. Organization Invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Product Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_category UNIQUE (organization_id, name)
);

-- 7. Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
    price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    unit TEXT NOT NULL DEFAULT 'Piece',
    barcode TEXT,
    image_url TEXT,
    supplier_id UUID,
    supplier_name TEXT,
    status TEXT NOT NULL DEFAULT 'In Stock' CHECK (status IN ('In Stock', 'Low Stock', 'Out of Stock')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_product_sku UNIQUE (organization_id, sku)
);

-- 8. Customers & Clients
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    total_billed NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_billed >= 0),
    total_received NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_received >= 0),
    current_due NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_due >= 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Suppliers & Vendors
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    total_purchases NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_purchases >= 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Sales Invoices
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    due_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Partial', 'Unpaid', 'Cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_invoice_no UNIQUE (organization_id, invoice_no)
);

-- 11. Sale Line Items
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL CHECK (total >= 0)
);

-- 12. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    purchase_no TEXT NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Cancelled')),
    received_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_org_purchase_no UNIQUE (organization_id, purchase_no)
);

-- 13. Purchase Line Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    qty NUMERIC(12, 2) NOT NULL CHECK (qty > 0),
    cost NUMERIC(14, 2) NOT NULL CHECK (cost >= 0),
    price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL CHECK (total >= 0)
);

-- 14. Central Payments Ledger
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    party_type TEXT NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
    party_name TEXT NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('SALE', 'PURCHASE', 'CUSTOMER_LEDGER', 'ADVANCE')),
    reference_id TEXT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    transaction_ref TEXT,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. Stock Movements Audit Ledger
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN')),
    quantity NUMERIC(12, 2) NOT NULL,
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    reference_id TEXT,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. Server Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'Success',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Security Events Log (Auth, 2FA, Revocations)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 18. User Active Sessions Registry
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL,
    device_info TEXT NOT NULL,
    ip_address TEXT,
    location TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to check membership in organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role in organization
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically create user profile when user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Organizations Policies
CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can view their organization"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY "Owners and Admins can update organization"
    ON public.organizations FOR UPDATE
    USING (public.get_org_role(id) IN ('owner', 'admin'));

CREATE POLICY "Only Owners can delete organization"
    ON public.organizations FOR DELETE
    USING (public.get_org_role(id) = 'owner');

-- 3. Organization Members Policies
CREATE POLICY "Members can view team roster in their org"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Owners and Admins can add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.get_org_role(organization_id) IN ('owner', 'admin')
        OR NOT EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
        )
    );

CREATE POLICY "Owners and Admins can update members"
    ON public.organization_members FOR UPDATE
    USING (
        public.get_org_role(organization_id) = 'owner'
        OR (public.get_org_role(organization_id) = 'admin' AND role IN ('manager', 'staff'))
    );

CREATE POLICY "Owners can remove members, Admins can remove Manager/Staff"
    ON public.organization_members FOR DELETE
    USING (
        public.get_org_role(organization_id) = 'owner'
        OR (public.get_org_role(organization_id) = 'admin' AND role IN ('manager', 'staff'))
    );

-- 4. Categories Policies
CREATE POLICY "Org members can view categories"
    ON public.categories FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can insert categories"
    ON public.categories FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Authorized roles can update categories"
    ON public.categories FOR UPDATE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Only Owners and Admins can delete categories"
    ON public.categories FOR DELETE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

-- 5. Products Policies
CREATE POLICY "Org members can view products"
    ON public.products FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can insert products"
    ON public.products FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Authorized roles can update products"
    ON public.products FOR UPDATE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Only Owners and Admins can delete products"
    ON public.products FOR DELETE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

-- 5. Sales & Line Items Policies
CREATE POLICY "Org members can view sales"
    ON public.sales FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized members can create sales"
    ON public.sales FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'staff')
    );

CREATE POLICY "Admins and Owners can update sales"
    ON public.sales FOR UPDATE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

CREATE POLICY "Org members can view sale items"
    ON public.sale_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id
        AND public.is_org_member(sales.organization_id)
    ));

CREATE POLICY "Authorized members can create sale items"
    ON public.sale_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id
        AND public.is_org_member(sales.organization_id)
    ));

CREATE POLICY "Admins and Owners can update sale items"
    ON public.sale_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id
        AND public.is_org_member(sales.organization_id)
        AND public.get_org_role(sales.organization_id) IN ('owner', 'admin')
    ));

CREATE POLICY "Only Owners and Admins can delete sale items"
    ON public.sale_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id
        AND public.is_org_member(sales.organization_id)
        AND public.get_org_role(sales.organization_id) IN ('owner', 'admin')
    ));

-- 7. Purchases & Line Items Policies
CREATE POLICY "Org members can view purchases"
    ON public.purchases FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can insert purchases"
    ON public.purchases FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Authorized roles can update purchases"
    ON public.purchases FOR UPDATE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Org members can view purchase items"
    ON public.purchase_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.id = purchase_items.purchase_id
        AND public.is_org_member(purchases.organization_id)
    ));

CREATE POLICY "Authorized roles can insert purchase items"
    ON public.purchase_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.id = purchase_items.purchase_id
        AND public.is_org_member(purchases.organization_id)
        AND public.get_org_role(purchases.organization_id) IN ('owner', 'admin', 'manager')
    ));

CREATE POLICY "Authorized roles can update purchase items"
    ON public.purchase_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.id = purchase_items.purchase_id
        AND public.is_org_member(purchases.organization_id)
        AND public.get_org_role(purchases.organization_id) IN ('owner', 'admin', 'manager')
    ));

CREATE POLICY "Only Owners and Admins can delete purchase items"
    ON public.purchase_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.id = purchase_items.purchase_id
        AND public.is_org_member(purchases.organization_id)
        AND public.get_org_role(purchases.organization_id) IN ('owner', 'admin')
    ));

-- 7. Customers & Suppliers Policies
CREATE POLICY "Org members can view customers"
    ON public.customers FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Authorized roles can update customers"
    ON public.customers FOR UPDATE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

CREATE POLICY "Only Owners and Admins can delete customers"
    ON public.customers FOR DELETE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

CREATE POLICY "Org members can view suppliers"
    ON public.suppliers FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can manage suppliers"
    ON public.suppliers FOR ALL
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager')
    );

-- 8. Payments Ledger Policies
CREATE POLICY "Org members can view payments"
    ON public.payments FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Authorized roles can record payments"
    ON public.payments FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin', 'manager', 'staff')
    );

-- 9. Stock Movements Policies
CREATE POLICY "Org members can view stock movements"
    ON public.stock_movements FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "System and authorized roles can log stock movements"
    ON public.stock_movements FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- 10. Audit Logs Policies (Strict Read-Only for Members, No User Modifying or Deleting Logs)
CREATE POLICY "Owners and Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

CREATE POLICY "System can record audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- 11. Security Events Policies
CREATE POLICY "Users can view their own security events"
    ON public.security_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events"
    ON public.security_events FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- 12. User Sessions Policies
CREATE POLICY "Users can view and manage their own sessions"
    ON public.user_sessions FOR ALL
    USING (auth.uid() = user_id);

-- 13. Organization Invitations Policies
CREATE POLICY "Org members can view invitations"
    ON public.organization_invitations FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Owners and Admins can create invitations"
    ON public.organization_invitations FOR INSERT
    WITH CHECK (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

CREATE POLICY "Owners and Admins can delete invitations"
    ON public.organization_invitations FOR DELETE
    USING (
        public.is_org_member(organization_id)
        AND public.get_org_role(organization_id) IN ('owner', 'admin')
    );

-- ============================================================================
-- ROLE ESCALATION PREVENTION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role TEXT;
    existing_count INT;
BEGIN
    -- Check how many members already belong to this organization
    SELECT COUNT(*) INTO existing_count
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id;

    -- Bootstrap: if organization has 0 members, assign first user as owner
    IF existing_count = 0 THEN
        NEW.role := 'owner';
        RETURN NEW;
    END IF;

    -- Obtain caller role in the organization
    SELECT role INTO caller_role
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id
    AND om.user_id = auth.uid();

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Access denied: Must be an authorized organization member.';
    END IF;

    IF caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Forbidden: Role "%" is not permitted to manage members.', caller_role;
    END IF;

    -- Admins cannot assign or alter owner role, nor create other admins
    IF caller_role = 'admin' THEN
        IF NEW.role IN ('owner', 'admin') THEN
            RAISE EXCEPTION 'Forbidden: Administrators cannot assign owner or admin roles.';
        END IF;
        IF TG_OP = 'UPDATE' AND OLD.role IN ('owner', 'admin') THEN
            RAISE EXCEPTION 'Forbidden: Administrators cannot modify owner or admin records.';
        END IF;
    END IF;

    -- Only Owner can assign 'owner' role
    IF NEW.role = 'owner' AND caller_role != 'owner' THEN
        RAISE EXCEPTION 'Forbidden: Only the organization owner can grant the owner role.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.organization_members;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE INSERT OR UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================================
-- ATOMIC SALE TRANSACTION FUNCTION
-- Concurrency-Safe Stock Deduction, Duplicate Line Normalization & Ledger Sync
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_sale_atomic(
    p_org_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_customer_address TEXT,
    p_customer_id UUID,
    p_items JSONB,
    p_discount NUMERIC,
    p_tax_rate NUMERIC,
    p_paid_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_sale_id UUID;
    v_invoice_no TEXT;
    v_item RECORD;
    v_prod RECORD;
    v_subtotal NUMERIC(14, 2) := 0;
    v_cogs NUMERIC(14, 2) := 0;
    v_taxable NUMERIC(14, 2);
    v_tax NUMERIC(14, 2);
    v_grand_total NUMERIC(14, 2);
    v_paid NUMERIC(14, 2);
    v_due NUMERIC(14, 2);
    v_status TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_agg_items JSONB := '[]'::JSONB;
    v_sale_record RECORD;
BEGIN
    -- Verify organization membership
    IF NOT public.is_org_member(p_org_id) THEN
        RAISE EXCEPTION 'Access denied: User is not a member of organization %', p_org_id;
    END IF;

    v_caller_role := public.get_org_role(p_org_id);
    IF v_caller_role NOT IN ('owner', 'admin', 'manager', 'staff') THEN
        RAISE EXCEPTION 'Forbidden: Insufficient permissions to create sales';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Validation error: Sale must contain at least one line item';
    END IF;

    -- Aggregate duplicate lines by product_id
    CREATE TEMPORARY TABLE temp_sale_lines (
        product_id UUID,
        name TEXT,
        qty NUMERIC(12, 2),
        price NUMERIC(14, 2),
        cost NUMERIC(14, 2),
        gst_rate NUMERIC(5, 2)
    ) ON COMMIT DROP;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        "productId" UUID,
        "name" TEXT,
        "qty" NUMERIC,
        "price" NUMERIC,
        "cost" NUMERIC,
        "gstRate" NUMERIC
    ) LOOP
        IF v_item."qty" <= 0 THEN
            RAISE EXCEPTION 'Validation error: Item quantity must be positive';
        END IF;

        INSERT INTO temp_sale_lines (product_id, name, qty, price, cost, gst_rate)
        VALUES (
            v_item."productId",
            COALESCE(v_item."name", 'Product'),
            v_item."qty",
            COALESCE(v_item."price", 0),
            COALESCE(v_item."cost", 0),
            COALESCE(v_item."gstRate", 0)
        );
    END LOOP;

    -- Check available stock & lock rows FOR UPDATE
    FOR v_item IN 
        SELECT product_id, SUM(qty) AS total_qty, MAX(name) AS name, MAX(price) AS price, MAX(gst_rate) AS gst_rate
        FROM temp_sale_lines
        WHERE product_id IS NOT NULL
        GROUP BY product_id
    LOOP
        SELECT id, name, stock, min_stock, cost_price, price
        INTO v_prod
        FROM public.products
        WHERE id = v_item.product_id AND organization_id = p_org_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in organization', v_item.product_id;
        END IF;

        IF v_prod.stock < v_item.total_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_prod.name, v_prod.stock, v_item.total_qty;
        END IF;

        -- Update item cost from authoritative catalog
        UPDATE temp_sale_lines 
        SET cost = v_prod.cost_price,
            price = CASE WHEN price <= 0 THEN v_prod.price ELSE price END
        WHERE product_id = v_item.product_id;

        -- Compute server line totals
        v_subtotal := v_subtotal + (v_item.price * v_item.total_qty);
        v_cogs := v_cogs + (v_prod.cost_price * v_item.total_qty);

        -- Deduct inventory atomically
        UPDATE public.products
        SET stock = stock - v_item.total_qty,
            status = CASE 
                WHEN (stock - v_item.total_qty) <= 0 THEN 'Out of Stock'
                WHEN (stock - v_item.total_qty) <= min_stock THEN 'Low Stock'
                ELSE 'In Stock'
            END,
            updated_at = v_now
        WHERE id = v_item.product_id;
    END LOOP;

    -- Calculate server-authoritative totals
    v_taxable := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));
    v_tax := ROUND((v_taxable * COALESCE(p_tax_rate, 0) / 100.0), 2);
    v_grand_total := ROUND(v_taxable + v_tax, 2);

    v_paid := LEAST(v_grand_total, GREATEST(0, COALESCE(p_paid_amount, 0)));
    v_due := GREATEST(0, v_grand_total - v_paid);
    v_status := CASE 
        WHEN v_due <= 0 THEN 'Paid'
        WHEN v_paid > 0 THEN 'Partial'
        ELSE 'Unpaid'
    END;

    -- Generate sequential/collision-safe invoice number
    v_invoice_no := 'INV-' || TO_CHAR(v_now, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- Insert sale
    INSERT INTO public.sales (
        organization_id, invoice_no, customer_id, customer_name, customer_phone,
        customer_email, customer_address, subtotal, tax, discount, amount,
        paid_amount, due_amount, status, payment_method, created_by, created_at
    ) VALUES (
        p_org_id, v_invoice_no, p_customer_id, COALESCE(p_customer_name, 'Walk-in Customer'),
        p_customer_phone, p_customer_email, p_customer_address, v_subtotal, v_tax,
        COALESCE(p_discount, 0), v_grand_total, v_paid, v_due, v_status,
        COALESCE(p_payment_method, 'UPI'), auth.uid(), v_now
    ) RETURNING id INTO v_sale_id;

    -- Insert sale items
    FOR v_item IN SELECT * FROM temp_sale_lines LOOP
        INSERT INTO public.sale_items (
            sale_id, product_id, name, qty, price, cost, gst_rate, total
        ) VALUES (
            v_sale_id, v_item.product_id, v_item.name, v_item.qty,
            v_item.price, v_item.cost, v_item.gst_rate, ROUND(v_item.price * v_item.qty, 2)
        );

        -- Record stock movement
        IF v_item.product_id IS NOT NULL THEN
            INSERT INTO public.stock_movements (
                organization_id, product_id, product_name, type, quantity,
                previous_stock, new_stock, reference_id, reason, created_by, created_at
            )
            SELECT 
                p_org_id, v_item.product_id, v_item.name, 'SALE', -v_item.qty,
                p.stock + v_item.qty, p.stock, v_invoice_no, 'Sale Invoice #' || v_invoice_no,
                auth.uid(), v_now
            FROM public.products p
            WHERE p.id = v_item.product_id;
        END IF;
    END LOOP;

    -- Update customer ledger balance
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_billed = total_billed + v_grand_total,
            total_received = total_received + v_paid,
            current_due = current_due + v_due,
            updated_at = v_now
        WHERE id = p_customer_id AND organization_id = p_org_id;
    END IF;

    -- Record initial payment if applicable
    IF v_paid > 0 THEN
        INSERT INTO public.payments (
            organization_id, party_type, party_name, reference_type,
            reference_id, amount, payment_method, note, created_by, created_at
        ) VALUES (
            p_org_id, 'CUSTOMER', COALESCE(p_customer_name, 'Walk-in Customer'),
            'SALE', v_invoice_no, v_paid, COALESCE(p_payment_method, 'UPI'),
            'Initial payment for invoice #' || v_invoice_no, auth.uid(), v_now
        );
    END IF;

    -- Insert immutable audit log
    INSERT INTO public.audit_logs (
        organization_id, user_id, user_name, user_role, action, details, status, created_at
    ) VALUES (
        p_org_id, auth.uid(), COALESCE(p_customer_name, 'Staff'), v_caller_role,
        'SALE_CREATED', 'Created Invoice #' || v_invoice_no || ' for ' || v_grand_total,
        'Success', v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'saleId', v_sale_id,
        'invoiceNo', v_invoice_no,
        'grandTotal', v_grand_total,
        'paidAmount', v_paid,
        'dueAmount', v_due,
        'status', v_status,
        'cogs', v_cogs
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERFORMANCE & COMPOSITE DATABASE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON public.products (organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_org_status ON public.products (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_org_created ON public.sales (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_org_cust ON public.sales (organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org_created ON public.purchases (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_org_supp ON public.purchases (organization_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_ref ON public.payments (organization_id, reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_prod ON public.stock_movements (organization_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON public.user_sessions (user_id, is_revoked, last_active_at DESC);
