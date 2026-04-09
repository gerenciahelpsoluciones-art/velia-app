-- Tabla de perfiles vinculada a auth.users con enfoque Velia
create table if not exists public.velia_perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text check (rol in ('admin', 'vendedor', 'bodega')) default 'vendedor',
  estado text check (estado in ('activo', 'inactivo')) default 'activo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table public.velia_perfiles enable row level security;

-- Políticas de acceso para Velia
-- Nota: En un entorno compartido, cada app solo debe leer su propia tabla de perfiles
create policy "Los perfiles de Velia son visibles por autenticados"
  on public.velia_perfiles for select
  using ( auth.role() = 'authenticated' );

create policy "Administradores de Velia gestionan todos los perfiles Velia"
  on public.velia_perfiles for all
  using ( 
    exists (
      select 1 from public.velia_perfiles 
      where id = auth.uid() and rol = 'admin'
    )
  );

-- Trigger para crear perfil de VELIA condicionalmente
-- Esto evita que usuarios del CRM generen registros en la tabla de Velia
create or replace function public.handle_new_velia_user()
returns trigger as $$
begin
  -- Solo insertar si el usuario se registró desde la aplicación Velia
  -- Se asocia con el metadato 'app' => 'velia' definido en el SignUp
  if (new.raw_user_meta_data->>'app' = 'velia') then
    insert into public.velia_perfiles (id, nombre, email, rol)
    values (
      new.id, 
      coalesce(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario Velia'), 
      new.email, 
      case 
        when new.email = 'admin@velia.com' then 'admin' 
        else 'vendedor' 
      end
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Re-crear el trigger
drop trigger if exists on_auth_user_created_velia on auth.users;

create trigger on_auth_user_created_velia
  after insert on auth.users
  for each row execute procedure public.handle_new_velia_user();
