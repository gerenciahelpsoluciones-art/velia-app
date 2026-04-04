"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  category: "Perfumería" | "Bisutería";
  costPrice: number;
  salePrice: number;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  date: string;
  paymentMethod: string;
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Load products
    const { data: prodData } = await supabase.from("productos").select("*").order("nombre");
    if (prodData) {
      const mappedProducts: Product[] = prodData.map(p => ({
        id: p.id,
        name: p.nombre,
        category: p.categoria,
        costPrice: p.costo,
        salePrice: p.precio_venta,
        stock: p.stock
      }));
      setProducts(mappedProducts);
    }

    // Load sales history
    const { data: salesData } = await supabase
      .from("ventas")
      .select("*, detalles_venta(*)")
      .order("fecha", { ascending: false })
      .limit(20);
      
    if (salesData) {
      const mappedSales: Sale[] = salesData.map(s => ({
        id: s.id,
        items: s.detalles_venta.map((d: any) => ({
          name: d.nombre_producto,
          quantity: d.cantidad,
          unitPrice: d.precio_unitario,
          subtotal: d.subtotal
        })),
        subtotal: s.subtotal,
        discount: s.descuento,
        discountType: s.tipo_descuento,
        total: s.total,
        date: s.fecha,
        paymentMethod: s.metodo_pago
      }));
      setSalesHistory(mappedSales);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableProducts = products.filter(p =>
    p.stock > 0 && p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Can't add more than stock
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product || newQty > product.stock) return;

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  const cartCost = cart.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
  const discountAmount = discountType === "percent"
    ? Math.round(cartSubtotal * (discountValue / 100))
    : discountValue;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const processSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create Sale Header
      const { data: saleData, error: saleError } = await supabase
        .from("ventas")
        .insert([{
          subtotal: cartSubtotal,
          descuento: discountAmount,
          tipo_descuento: discountType === "percent" ? `${discountValue}%` : `$${discountValue.toLocaleString("es-CO")}`,
          total: cartTotal,
          metodo_pago: paymentMethod,
          usuario_id: user?.id
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Create Sale Details & Update Stock
      for (const item of cart) {
        // Add detail
        await supabase.from("detalles_venta").insert([{
          venta_id: saleData.id,
          producto_id: item.product.id,
          nombre_producto: item.product.name,
          cantidad: item.quantity,
          precio_unitario: item.product.salePrice,
          subtotal: item.product.salePrice * item.quantity
        }]);

        // Update stock
        await supabase
          .from("productos")
          .update({ stock: item.product.stock - item.quantity })
          .eq("id", item.product.id);
      }

      // Refresh data
      await fetchData();
      
      // Show confirmation
      setLastSale(saleData as any); // Simplificado para el modal
      setShowConfirmation(true);
      setCart([]);
      setDiscountValue(0);
    } catch (err: any) {
      alert("Error al procesar la venta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const todaySales = salesHistory.filter(s => {
    const saleDate = new Date(s.date).toDateString();
    return saleDate === new Date().toDateString();
  });
  const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Punto de Venta</h1>
          <p style={{ opacity: 0.6 }}>Registre ventas y descuente inventario automáticamente</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>Ventas de hoy</p>
          <p className="font-playfair" style={{ fontSize: "1.8rem", color: "var(--velia-emerald)", fontWeight: "700" }}>
            ${todayTotal.toLocaleString("es-CO")}
          </p>
          <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>{todaySales.length} transacciones</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1.5rem", alignItems: "start" }}>

        {/* ── CATÁLOGO DE PRODUCTOS ── */}
        <div>
          <div className="velia-card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <svg width="20" height="20" fill="none" stroke="var(--velia-emerald)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar producto por nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {availableProducts.map(product => {
              const inCart = cart.find(item => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="velia-card"
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: inCart ? "2px solid var(--velia-emerald)" : "1px solid var(--glass-border)",
                    position: "relative",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                >
                  {inCart && (
                    <div style={{
                      position: "absolute", top: "-8px", right: "-8px",
                      background: "var(--velia-emerald)", color: "white",
                      width: "28px", height: "28px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", fontWeight: "700",
                    }}>
                      {inCart.quantity}
                    </div>
                  )}
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "10px",
                    background: product.category === "Perfumería" ? "rgba(6, 78, 59, 0.08)" : "rgba(183, 110, 121, 0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "0.75rem", fontSize: "1.2rem",
                  }}>
                    {product.category === "Perfumería" ? "🧴" : "💎"}
                  </div>
                  <p style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.25rem" }}>{product.name}</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.5rem" }}>{product.category}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontWeight: "700", color: "var(--velia-emerald)", fontSize: "1.1rem" }}>
                      ${Number(product.salePrice).toLocaleString("es-CO")}
                    </p>
                    <span style={{
                      fontSize: "0.7rem", padding: "0.2rem 0.5rem",
                      borderRadius: "100px", background: "rgba(6, 78, 59, 0.06)",
                      color: "var(--velia-emerald)", fontWeight: "600",
                    }}>
                      {product.stock} disp.
                    </span>
                  </div>
                </div>
              );
            })}

            {availableProducts.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", opacity: 0.5 }}>
                <p style={{ fontSize: "1rem" }}>
                  {searchTerm ? "No se encontraron productos" : "No hay productos con stock disponible"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CARRITO / TICKET ── */}
        <div className="velia-card" style={{ position: "sticky", top: "1rem" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>
            🧾 Ticket de Venta
          </h2>

          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", opacity: 0.4 }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: "0.5rem" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p>Seleccione productos del catálogo</p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "1rem" }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 0", borderBottom: "1px solid var(--glass-border)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>{item.product.name}</p>
                      <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                        ${Number(item.product.salePrice).toLocaleString("es-CO")} c/u
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        style={{
                          width: "28px", height: "28px", borderRadius: "6px",
                          border: "1px solid var(--glass-border)", background: "white",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1rem", fontWeight: "700",
                        }}
                      >−</button>
                      <span style={{ width: "28px", textAlign: "center", fontWeight: "700", fontSize: "0.9rem" }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        style={{
                          width: "28px", height: "28px", borderRadius: "6px",
                          border: "1px solid var(--glass-border)", background: "white",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1rem", fontWeight: "700",
                        }}
                      >+</button>
                    </div>
                    <p style={{ fontWeight: "700", minWidth: "80px", textAlign: "right", fontSize: "0.9rem" }}>
                      ${(item.product.salePrice * item.quantity).toLocaleString("es-CO")}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--velia-danger)", padding: "4px",
                      }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Descuento */}
              <div style={{
                border: "1px solid var(--glass-border)", borderRadius: "10px",
                padding: "0.75rem", marginBottom: "0.75rem",
                background: discountValue > 0 ? "rgba(183, 110, 121, 0.04)" : "transparent",
              }}>
                <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>
                  🏷️ Descuento
                </label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select
                    className="form-select"
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as "percent" | "fixed")}
                    style={{ width: "90px", padding: "0.4rem", fontSize: "0.8rem" }}
                  >
                    <option value="percent">%</option>
                    <option value="fixed">$ Fijo</option>
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    min="0"
                    max={discountType === "percent" ? 100 : cartSubtotal}
                    value={discountValue || ""}
                    onChange={e => {
                      let val = Number(e.target.value);
                      if (discountType === "percent" && val > 100) val = 100;
                      if (discountType === "fixed" && val > cartSubtotal) val = cartSubtotal;
                      setDiscountValue(val);
                    }}
                    style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                  />
                  {discountValue > 0 && (
                    <button
                      onClick={() => setDiscountValue(0)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--velia-danger)", fontSize: "1.1rem", padding: "2px",
                      }}
                    >✕</button>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div style={{ borderTop: "2px solid var(--glass-border)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", opacity: 0.6, fontSize: "0.85rem" }}>
                  <span>Subtotal ({cart.reduce((a, i) => a + i.quantity, 0)} artículos)</span>
                  <span>${cartSubtotal.toLocaleString("es-CO")}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--velia-rose-gold)" }}>
                    <span>Descuento ({discountType === "percent" ? `${discountValue}%` : "fijo"})</span>
                    <span>-${discountAmount.toLocaleString("es-CO")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", opacity: 0.6, fontSize: "0.85rem" }}>
                  <span>Ganancia estimada</span>
                  <span style={{ color: "var(--velia-success)" }}>+${(cartTotal - cartCost).toLocaleString("es-CO")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", fontSize: "1.4rem", fontWeight: "700" }}>
                  <span className="font-playfair">Total</span>
                  <span style={{ color: "var(--velia-emerald)" }}>${cartTotal.toLocaleString("es-CO")}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Método de Pago</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Nequi">📱 Nequi</option>
                  <option value="Daviplata">📱 Daviplata</option>
                </select>
              </div>

              <button
                className="btn-emerald"
                onClick={processSale}
                style={{ width: "100%", marginTop: "1rem", padding: "0.9rem", fontSize: "1rem" }}
              >
                Procesar Venta
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── HISTORIAL DE VENTAS ── */}
      {salesHistory.length > 0 && (
        <section className="velia-card" style={{ marginTop: "2rem", padding: 0 }}>
          <div style={{ padding: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>Historial de Ventas</h2>
            <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>{salesHistory.length} ventas registradas</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Dto.</th>
                  <th>Método</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.slice(0, 15).map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{sale.id.replace("V-", "").slice(-6)}</td>
                    <td>{new Date(sale.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td>
                      {sale.items.map(i => `${i.name} (x${i.quantity})`).join(", ")}
                    </td>
                    <td style={{ color: sale.discount > 0 ? "var(--velia-rose-gold)" : "inherit", fontSize: "0.8rem" }}>
                      {sale.discount > 0 ? `-$${sale.discount.toLocaleString("es-CO")}` : "—"}
                    </td>
                    <td>
                      <span style={{
                        padding: "0.2rem 0.6rem", borderRadius: "100px",
                        fontSize: "0.75rem", fontWeight: "600",
                        background: "rgba(6, 78, 59, 0.06)",
                        color: "var(--velia-emerald)",
                      }}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td style={{ fontWeight: "700" }}>${sale.total.toLocaleString("es-CO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── CONFIRMACIÓN DE VENTA ── */}
      {showConfirmation && lastSale && (
        <div className="modal-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px", textAlign: "center" }}>
            <div style={{ padding: "2.5rem 2rem" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.1)", margin: "0 auto 1.5rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="32" height="32" fill="none" stroke="var(--velia-success)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-playfair" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>¡Venta Registrada!</h2>
              <p style={{ opacity: 0.6, marginBottom: "1.5rem" }}>El inventario ha sido actualizado automáticamente</p>

              <div style={{ background: "rgba(6, 78, 59, 0.03)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                {lastSale.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                    <span>{item.name} x{item.quantity}</span>
                    <span>${item.subtotal.toLocaleString("es-CO")}</span>
                  </div>
                ))}
                {lastSale.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--velia-rose-gold)" }}>
                    <span>Descuento ({lastSale.discountType})</span>
                    <span>-${lastSale.discount.toLocaleString("es-CO")}</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: "0.75rem", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "1.1rem" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--velia-emerald)" }}>${lastSale.total.toLocaleString("es-CO")}</span>
                </div>
                <p style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: "0.5rem" }}>Pago: {lastSale.paymentMethod}</p>
              </div>

              <button className="btn-emerald" onClick={() => setShowConfirmation(false)} style={{ width: "100%" }}>
                Continuar Vendiendo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
