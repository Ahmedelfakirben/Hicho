-- ==============================================================================
-- SCHEMA CONSOLIDADO COMPLETO - CLIENTE NUEVO (LIN-Fashion / POS Ropa)
-- ==============================================================================
-- Instrucciones:
-- 1. Abre el panel de tu NUEVO proyecto en Supabase (https://supabase.com/dashboard).
-- 2. Ve a SQL Editor -> New Query.
-- 3. Copia y pega TODO este archivo y haz clic en "Run".
-- 4. Al finalizar, ve al final de este script para ver cómo crear tu primer usuario Super Admin.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS PRINCIPALES

-- Categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Productos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  brand TEXT,
  material TEXT,
  gender TEXT CHECK (gender IN ('hombre', 'mujer', 'unisex', 'niño', 'niña')),
  season TEXT CHECK (season IN ('primavera', 'verano', 'otoño', 'invierno', 'todas', 'primavera_verano', 'otoño_invierno', 'todo_el_año')),
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tallas de producto
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_sizes_barcode_idx ON public.product_sizes (barcode) WHERE barcode IS NOT NULL;

-- Galería de imágenes de productos
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mesas / Secciones (compatibilidad)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  seats INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','dirty')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de empleados vinculados a auth.users
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'cashier' CHECK (role IN ('super_admin', 'admin', 'cashier', 'barista', 'waiter')),
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Gastos
DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM ('supplier', 'salary', 'rent', 'utilities', 'maintenance', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category public.expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pedidos (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'completed', 'cancelled')),
  total DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'digital')),
  order_number INTEGER,
  service_type TEXT NOT NULL DEFAULT 'takeaway' CHECK (service_type IN ('dine_in','takeaway')),
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  tracking_code TEXT,
  shipping_status TEXT,
  shipping_date_report TIMESTAMPTZ,
  shipping_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Líneas de pedido (Order items)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de auditoría de pedidos
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'completed', 'cancelled')),
  status TEXT NOT NULL CHECK (status IN ('preparing', 'completed', 'cancelled')),
  total DECIMAL(10,2) NOT NULL,
  items JSONB,
  employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('UTC'::text, now()) NOT NULL
);

-- Sesiones de caja
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  opening_amount NUMERIC(12,2) NOT NULL CHECK (opening_amount >= 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  closing_amount NUMERIC(12,2) NULL CHECK (closing_amount >= 0),
  closed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Retiros de caja
CREATE TABLE IF NOT EXISTS public.cash_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  withdrawn_by UUID REFERENCES auth.users(id),
  withdrawn_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Devoluciones (Returns)
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  size_id UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  quantity_returned INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_refund DECIMAL(10,2) NOT NULL,
  reason TEXT DEFAULT '',
  returned_by UUID REFERENCES auth.users(id),
  withdrawal_id UUID REFERENCES public.cash_withdrawals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  size_id UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual_add', 'manual_deduct', 'sale', 'return', 'correction')),
  reason TEXT DEFAULT '',
  employee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de eliminados
CREATE TABLE IF NOT EXISTS public.deleted_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ DEFAULT now(),
  deleted_reason TEXT DEFAULT 'Eliminado por usuario',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deleted_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_number INTEGER,
  total DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,
  deleted_by UUID REFERENCES public.employee_profiles(id) NOT NULL,
  deletion_note TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permisos de roles
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  section VARCHAR(100) NOT NULL,
  page_id VARCHAR(100) NOT NULL,
  can_access BOOLEAN DEFAULT true,
  can_confirm_order BOOLEAN DEFAULT true,
  can_validate_order BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, section, page_id)
);

-- Ajustes de la empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL DEFAULT 'Linventory',
  address TEXT DEFAULT 'Dirección Comercial',
  phone VARCHAR(50) DEFAULT '+34 000 000 000',
  language VARCHAR(2) DEFAULT 'es' CHECK (language IN ('es', 'fr', 'en')),
  theme VARCHAR(20) DEFAULT 'amber' CHECK (theme IN ('amber', 'dark', 'blue', 'green', 'fashion')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Divisa
CREATE TABLE IF NOT EXISTS public.app_currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '€',
  currency_name VARCHAR(50) NOT NULL DEFAULT 'Euro',
  decimal_places INTEGER NOT NULL DEFAULT 2,
  position VARCHAR(10) NOT NULL DEFAULT 'after' CHECK (position IN ('before', 'after')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.available_currencies (
  code VARCHAR(3) PRIMARY KEY,
  symbol VARCHAR(5) NOT NULL,
  name VARCHAR(50) NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  symbol_position VARCHAR(10) DEFAULT 'after'
);

-- Configuración y logs de backups
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  backup_type VARCHAR(20) CHECK (backup_type IN ('manual', 'automatic')) DEFAULT 'manual',
  size_mb DECIMAL(10,2) NOT NULL,
  tables_included TEXT[] NOT NULL,
  status VARCHAR(20) CHECK (status IN ('completed', 'failed')) DEFAULT 'completed',
  notes TEXT,
  s3_url TEXT,
  file_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.backup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tables TEXT[] NOT NULL DEFAULT ARRAY[
    'products', 'categories', 'orders', 'order_items', 'employee_profiles',
    'cash_register_sessions', 'role_permissions', 'company_settings', 'tables'
  ],
  s3_enabled BOOLEAN DEFAULT true,
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_time VARCHAR(5) DEFAULT '02:00',
  schedule_frequency VARCHAR(20) DEFAULT 'daily' CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30,
  last_backup_at TIMESTAMPTZ,
  next_backup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);
CREATE INDEX IF NOT EXISTS idx_products_season ON public.products(season);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON public.product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_employee ON public.orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_employee ON public.cash_register_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_session ON public.cash_withdrawals(session_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_page ON public.role_permissions(page_id);


-- 4. FUNCIONES Y TRIGGERS

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS INTEGER AS $$
DECLARE
  today_start timestamptz;
  next_number integer;
BEGIN
  today_start := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT COALESCE(MAX(order_number), 0) INTO next_number
  FROM public.orders
  WHERE created_at >= today_start;
  RETURN next_number + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_order_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_history (
      order_id, action, status, total, items, employee_id, created_at
    ) VALUES (
      NEW.id, 'created', NEW.status, NEW.total,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'size_id', oi.size_id
          )
        )
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id
      ),
      NEW.employee_id, NEW.created_at
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.order_history (
      order_id, action, status, total, items, employee_id, created_at
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'updated'
      END,
      NEW.status, NEW.total,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'size_id', oi.size_id
          )
        )
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id
      ),
      NEW.employee_id, NOW()
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER handle_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_expenses_updated_at ON public.expenses;
CREATE TRIGGER handle_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS orders_audit_trigger ON public.orders;
CREATE TRIGGER orders_audit_trigger AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_change();

DROP TRIGGER IF EXISTS assign_order_number_trigger ON public.orders;
CREATE TRIGGER assign_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();


-- 5. RPCs PARA CONTROL ATÓMICO DE STOCK (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.decrement_product_size_stock(p_size_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.product_sizes
  SET stock = stock - p_quantity
  WHERE id = p_size_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - p_quantity
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET stock = COALESCE(stock, 0) + p_quantity
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_size_stock(p_size_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.product_sizes
  SET stock = COALESCE(stock, 0) + p_quantity
  WHERE id = p_size_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_size_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_size_stock TO authenticated;


-- 6. POLÍTICAS RLS (Row Level Security)

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_currency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;

-- Políticas Permisivas / Autenticadas para Operación Fluida
CREATE POLICY "Categories Select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Categories Manage" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Products Select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products Manage" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Product Sizes All" ON public.product_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Product Images All" ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Customers All" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Tables All" ON public.tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Orders All" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Order Items All" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Order History All" ON public.order_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Employee Profiles View" ON public.employee_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee Profiles Update" ON public.employee_profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Employee Profiles Insert" ON public.employee_profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Suppliers All" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Expenses All" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Cash Register All" ON public.cash_register_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Cash Withdrawals All" ON public.cash_withdrawals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Order Returns All" ON public.order_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Stock Movements All" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Role Permissions All" ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Company Settings All" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Currency All" ON public.app_currency_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Available Currencies All" ON public.available_currencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Backups History All" ON public.backup_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Backups Config All" ON public.backup_config FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 7. STORAGE BUCKET: product-images

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');


-- 8. SEMILLA DE DATOS INICIALES (Configuración base)

-- Divisas disponibles
INSERT INTO public.available_currencies (code, symbol, name, decimal_places, symbol_position) VALUES
  ('EUR', '€', 'Euro', 2, 'after'),
  ('USD', '$', 'US Dollar', 2, 'before'),
  ('MAD', 'DH', 'Moroccan Dirham', 2, 'after'),
  ('GBP', '£', 'British Pound', 2, 'before')
ON CONFLICT (code) DO NOTHING;

-- Configuración de divisa inicial
INSERT INTO public.app_currency_settings (currency_code, currency_symbol, currency_name, decimal_places, position)
VALUES ('EUR', '€', 'Euro', 2, 'after')
ON CONFLICT DO NOTHING;

-- Ajustes de empresa iniciales
INSERT INTO public.company_settings (company_name, address, phone, theme, language)
VALUES ('Linventory', 'Calle Comercio 123', '+34 600 000 000', 'amber', 'es')
ON CONFLICT DO NOTHING;

-- Permisos iniciales por rol (Role Permissions)
INSERT INTO public.role_permissions (role, section, page_id, can_access, can_confirm_order, can_validate_order) VALUES
  -- SUPER ADMIN
  ('super_admin', 'Ventas', 'pos', true, true, true),
  ('super_admin', 'Ventas', 'orders', true, true, true),
  ('super_admin', 'Inventario', 'products', true, true, true),
  ('super_admin', 'Inventario', 'categories', true, true, true),
  ('super_admin', 'Inventario', 'users', true, true, true),
  ('super_admin', 'Finanzas', 'cash', true, true, true),
  ('super_admin', 'Finanzas', 'time-tracking', true, true, true),
  ('super_admin', 'Finanzas', 'suppliers', true, true, true),
  ('super_admin', 'Finanzas', 'expenses', true, true, true),
  ('super_admin', 'Finanzas', 'analytics', true, true, true),
  ('super_admin', 'Finanzas', 'stock-analytics', true, true, true),
  ('super_admin', 'Finanzas', 'clients', true, true, true),
  ('super_admin', 'Sistema', 'role-management', true, true, true),
  ('super_admin', 'Sistema', 'company-settings', true, true, true),
  ('super_admin', 'Sistema', 'app-settings', true, true, true),
  ('super_admin', 'Sistema', 'server', false, true, true),
  ('super_admin', 'Sistema', 'backup', true, true, true),
  ('super_admin', 'Sistema', 'online-store', false, true, true),

  -- ADMIN
  ('admin', 'Ventas', 'pos', true, true, true),
  ('admin', 'Ventas', 'orders', true, true, true),
  ('admin', 'Inventario', 'products', true, true, true),
  ('admin', 'Inventario', 'categories', true, true, true),
  ('admin', 'Inventario', 'users', true, true, true),
  ('admin', 'Finanzas', 'cash', true, true, true),
  ('admin', 'Finanzas', 'time-tracking', true, true, true),
  ('admin', 'Finanzas', 'suppliers', true, true, true),
  ('admin', 'Finanzas', 'expenses', true, true, true),
  ('admin', 'Finanzas', 'analytics', true, true, true),
  ('admin', 'Finanzas', 'stock-analytics', true, true, true),
  ('admin', 'Finanzas', 'clients', true, true, true),
  ('admin', 'Sistema', 'role-management', false, true, true),
  ('admin', 'Sistema', 'company-settings', true, true, true),
  ('admin', 'Sistema', 'app-settings', true, true, true),
  ('admin', 'Sistema', 'server', false, true, true),
  ('admin', 'Sistema', 'backup', false, true, true),
  ('admin', 'Sistema', 'online-store', false, true, true),

  -- CASHIER (Cajero)
  ('cashier', 'Ventas', 'pos', true, true, true),
  ('cashier', 'Ventas', 'orders', true, true, true),
  ('cashier', 'Inventario', 'products', true, true, true),
  ('cashier', 'Inventario', 'categories', false, true, true),
  ('cashier', 'Inventario', 'users', false, true, true),
  ('cashier', 'Finanzas', 'cash', false, true, true),
  ('cashier', 'Finanzas', 'time-tracking', false, true, true),
  ('cashier', 'Finanzas', 'suppliers', false, true, true),
  ('cashier', 'Finanzas', 'expenses', false, true, true),
  ('cashier', 'Finanzas', 'analytics', false, true, true),
  ('cashier', 'Finanzas', 'stock-analytics', false, true, true),
  ('cashier', 'Finanzas', 'clients', true, true, true),
  ('cashier', 'Sistema', 'role-management', false, true, true),
  ('cashier', 'Sistema', 'company-settings', false, true, true),
  ('cashier', 'Sistema', 'app-settings', false, true, true),
  ('cashier', 'Sistema', 'server', false, true, true),
  ('cashier', 'Sistema', 'backup', false, true, true),
  ('cashier', 'Sistema', 'online-store', false, true, true)
ON CONFLICT (role, section, page_id) DO NOTHING;


-- ==============================================================================
-- PASO FINAL: CREAR EL USUARIO ADMINISTRADOR EN SUPABASE
-- ==============================================================================
-- 1. Ve a Authentication -> Users en tu panel de Supabase y pulsa "Add User" -> "Create User".
--    Introduce el email (ej. admin@hicho.com), contraseña, y marca "Auto Confirm User?".
-- 2. Copia el UID del usuario creado.
-- 3. Ejecuta la siguiente consulta sustituyendo 'PEGA_AQUI_EL_UID' y los datos:
--
-- INSERT INTO public.employee_profiles (id, full_name, email, role, active)
-- VALUES (
--   'PEGA_AQUI_EL_UID',
--   'Administrador General',
--   'admin@hicho.com',
--   'super_admin',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE 
-- SET role = 'super_admin', active = true;
-- ==============================================================================
