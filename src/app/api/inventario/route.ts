import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://matyjysinegbibdwzhoq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// PUT: Actualizar producto
export async function PUT(request: Request) {
  const { id, nombre, categoria, tipo, costo, precio_venta, stock } = await request.json();

  try {
    const { error } = await supabaseAdmin
      .from("velia_productos")
      .update({ nombre, categoria, tipo, costo, precio_venta, stock })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

// POST: Crear producto
export async function POST(request: Request) {
  const { nombre, categoria, tipo, costo, precio_venta, stock } = await request.json();

  try {
    const { data, error } = await supabaseAdmin
      .from("velia_productos")
      .insert([{ nombre, categoria, tipo, costo, precio_venta, stock }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

// DELETE: Eliminar producto
export async function DELETE(request: Request) {
  const { id } = await request.json();

  try {
    const { error } = await supabaseAdmin
      .from("velia_productos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
