-- 1. TABLA DE PRODUCTOS (INVENTARIO)
create table if not exists public.velia_productos (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    categoria text not null, -- 'Perfumería', 'Bisutería', etc.
    tipo text default 'Original', -- 'Original', 'Versión'
    costo numeric(12,2) default 0,
    precio_venta numeric(12,2) default 0,
    stock integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABLA DE VENTAS (CABECERA)
create table if not exists public.velia_ventas (
    id uuid primary key default gen_random_uuid(),
    subtotal numeric(12,2) not null,
    descuento numeric(12,2) default 0,
    tipo_descuento text, -- '%', 'Fixed'
    total numeric(12,2) not null,
    metodo_pago text not null, -- 'Efectivo', 'Tarjeta', etc.
    usuario_id uuid references auth.users(id),
    fecha timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABLA DE DETALLES DE VENTA
create table if not exists public.velia_detalles_venta (
    id uuid primary key default gen_random_uuid(),
    venta_id uuid references public.velia_ventas(id) on delete cascade,
    producto_id uuid references public.velia_productos(id) on delete set null,
    nombre_producto text not null,
    cantidad integer not null,
    precio_unitario numeric(12,2) not null,
    subtotal numeric(12,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABLA DE PROVEEDORES
create table if not exists public.velia_proveedores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    contacto text,
    telefono text,
    email text,
    direccion text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR RLS EN TODAS LAS TABLAS
alter table public.velia_productos enable row level security;
alter table public.velia_ventas enable row level security;
alter table public.velia_detalles_venta enable row level security;
alter table public.velia_proveedores enable row level security;

-- POLÍTICAS BÁSICAS (Acceso total para autenticados por ahora, igual que el CRM)
create policy "Acceso total para autenticados en velia_productos" on public.velia_productos for all using (auth.role() = 'authenticated');
create policy "Acceso total para autenticados en velia_ventas" on public.velia_ventas for all using (auth.role() = 'authenticated');
create policy "Acceso total para autenticados en velia_detalles_venta" on public.velia_detalles_venta for all using (auth.role() = 'authenticated');
create policy "Acceso total para autenticados en velia_proveedores" on public.velia_proveedores for all using (auth.role() = 'authenticated');
