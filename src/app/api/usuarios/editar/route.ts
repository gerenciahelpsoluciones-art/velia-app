import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, password, nombre, rol, estado } = await request.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://matyjysinegbibdwzhoq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // 1. Actualizar contraseña en Auth (si se provee)
    if (password && password.length >= 6) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });
      if (authError) throw authError;
    }

    // 2. Actualizar perfil en la tabla perfiles
    const updates: Record<string, string> = {};
    if (nombre) updates.nombre = nombre;
    if (rol) updates.rol = rol;
    if (estado) updates.estado = estado;

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("velia_perfiles")
        .update(updates)
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
