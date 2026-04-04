-- Tabla de perfiles vinculada a auth.users
create table public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text check (rol in ('admin', 'vendedor')) default 'vendedor',
  estado text check (estado in ('activo', 'inactivo')) default 'activo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table public.perfiles enable row level security;

-- Políticas de acceso
create policy "Los perfiles son visibles por todos los autenticados"
  on public.perfiles for select
  using ( auth.role() = 'authenticated' );

create policy "Solo administradores pueden insertar/actualizar perfiles"
  on public.perfiles for all
  using ( (select rol from public.perfiles where id = auth.uid()) = 'admin' );

-- Trigger para crear perfil automáticamente al registrarse en Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'), new.email, 
    case when new.email = 'admin@velia.com' then 'admin' else 'vendedor' end);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
