import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password, nombre, rol } = await request.json();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://matyjysinegbibdwzhoq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // 1. Crear el usuario en Auth (con confirmación automática)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nombre }
    });

    if (authError) throw authError;

    // 2. Crear el perfil en la tabla de perfiles (por si el trigger tarda o falla)
    const { error: profileError } = await supabaseAdmin.from("perfiles").insert([{
      id: authData.user.id,
      nombre,
      email,
      rol,
      estado: "activo"
    }]);

    // Ignoramos error de perfil si es por duplicidad (el trigger ya lo hizo)
    
    return NextResponse.json({ success: true, user: authData.user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
