"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

interface SaleDetail {
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Sale {
  id: string;
  subtotal: number;
  descuento: number;
  tipo_descuento: string;
  total: number;
  fecha: string;
  metodo_pago: string;
  detalles_venta: SaleDetail[];
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
  
  // Detalles de Venta Histórica
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const ticketRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    // Load products
    const { data: prodData } = await supabase.from("velia_productos").select("*").order("nombre");
    if (prodData) {
      setProducts(prodData.map(p => ({
        id: p.id,
        name: p.nombre,
        category: p.categoria,
        costPrice: p.costo,
        salePrice: p.precio_venta,
        stock: p.stock
      })));
    }

    // Load sales history
    const { data: salesData } = await supabase
      .from("velia_ventas")
      .select("*, detalles_venta(*)")
      .order("fecha", { ascending: false })
      .limit(20);
      
    if (salesData) {
      setSalesHistory(salesData as Sale[]);
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
        if (existing.quantity >= product.stock) return prev;
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
        .from("velia_ventas")
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
      const saleDetails = [];
      for (const item of cart) {
        saleDetails.push({
          venta_id: saleData.id,
          producto_id: item.product.id,
          nombre_producto: item.product.name,
          cantidad: item.quantity,
          precio_unitario: item.product.salePrice,
          subtotal: item.product.salePrice * item.quantity
        });

        await supabase
          .from("velia_productos")
          .update({ stock: item.product.stock - item.quantity })
          .eq("id", item.product.id);
      }

      await supabase.from("velia_detalles_venta").insert(saleDetails);

      // Refresh
      await fetchData();
      
      setLastSale({ ...saleData, detalles_venta: saleDetails });
      setShowConfirmation(true);
      setCart([]);
      setDiscountValue(0);
    } catch (err: any) {
      alert("Error al procesar la venta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const todaySales = salesHistory.filter(s => {
    const saleDate = new Date(s.fecha).toDateString();
    return saleDate === new Date().toDateString();
  });
  const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div>
          <h1 className="font-playfair">Punto de Venta</h1>
          <p>Registro de ventas y control de inventario automático</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>Caja de Hoy</p>
          <p className="font-playfair" style={{ fontSize: "1.8rem", color: "var(--velia-emerald)", fontWeight: "700" }}>
            ${todayTotal.toLocaleString("es-CO")}
          </p>
          <p style={{ fontSize: "0.8rem", opacity: 0.5 }}>{todaySales.length} ventas hoy</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1.5rem", alignItems: "start" }}>

        {/* ── CATÁLOGO ── */}
        <div>
          <div className="velia-card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <svg width="20" height="20" fill="none" stroke="var(--velia-emerald)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre de pieza..."
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
                    border: inCart ? "2px solid var(--velia-emerald)" : "1px solid var(--glass-border)",
                    position: "relative",
                  }}
                >
                  {inCart && (
                    <div style={{
                      position: "absolute", top: "-8px", right: "-8px",
                      background: "var(--velia-emerald)", color: "white",
                      width: "24px", height: "24px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: "700", zIndex: 10
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
                  <p style={{ fontWeight: "600", fontSize: "0.9rem", marginBottom: "0.25rem" }}>{product.name}</p>
                  <p style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.5rem" }}>{product.category}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontWeight: "700", color: "var(--velia-emerald)", fontSize: "1rem" }}>
                      ${product.salePrice.toLocaleString("es-CO")}
                    </p>
                    <span className={`badge ${product.stock <= 5 ? 'badge-low-stock' : 'badge-in-stock'}`} style={{ fontSize: "0.65rem" }}>
                      {product.stock} disp.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TICKET ACTUAL ── */}
        <div className="velia-card" style={{ position: "sticky", top: "1rem" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.3rem", marginBottom: "1.25rem" }}>🧾 Venta Actual</h2>

          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 0" }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              <p>El ticket está vacío</p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: "350px", overflowY: "auto", marginBottom: "1.5rem" }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 0", borderBottom: "1px solid var(--glass-border)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "600", fontSize: "0.85rem" }}>{item.product.name}</p>
                      <p style={{ fontSize: "0.7rem", opacity: 0.5 }}>${item.product.salePrice.toLocaleString("es-CO")}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button className="btn-icon" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={{ padding: "2px" }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>{item.quantity}</span>
                      <button className="btn-icon" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={{ padding: "2px" }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <p style={{ fontWeight: "700", minWidth: "70px", textAlign: "right", fontSize: "0.85rem" }}>
                      ${(item.product.salePrice * item.quantity).toLocaleString("es-CO")}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(6, 78, 59, 0.03)", borderRadius: "12px", padding: "1rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value as any)} style={{ width: "80px", padding: "0.4rem" }}>
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                  <input
                    type="number" className="form-input" placeholder="Dto." value={discountValue || ""}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    style={{ flex: 1, padding: "0.4rem" }}
                  />
                </div>
              </div>

              <div style={{ borderTop: "2px dashed var(--glass-border)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", opacity: 0.6, fontSize: "0.8rem" }}>
                  <span>Subtotal</span>
                  <span>${cartSubtotal.toLocaleString("es-CO")}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", color: "var(--velia-rose-gold)", fontSize: "0.8rem" }}>
                    <span>Descuento</span>
                    <span>-${discountAmount.toLocaleString("es-CO")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "1.2rem", fontWeight: "700" }}>
                  <span className="font-playfair">Total</span>
                  <span style={{ color: "var(--velia-emerald)" }}>${cartTotal.toLocaleString("es-CO")}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "1.5rem" }}>
                <label className="form-label">Método de Pago</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Nequi">📱 Nequi</option>
                </select>
              </div>

              <button className="btn-emerald" onClick={processSale} style={{ width: "100%", padding: "1rem" }} disabled={loading}>
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <section className="velia-card" style={{ marginTop: "2rem", padding: 0 }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--glass-border)" }}>
          <h2 className="font-playfair">Ventas Recientes</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Método</th>
                <th>Descuento</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.map(s => (
                <tr key={s.id} onClick={() => openSaleDetails(s)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>#{s.id.slice(-6).toUpperCase()}</td>
                  <td>{new Date(s.fecha).toLocaleString()}</td>
                  <td><span className="badge badge-perfumeria">{s.metodo_pago}</span></td>
                  <td>{s.descuento > 0 ? `-$${s.descuento.toLocaleString()}` : '—'}</td>
                  <td style={{ fontWeight: "700" }}>${s.total.toLocaleString("es-CO")}</td>
                  <td>
                    <button className="btn-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DETALLES VENTA / TICKET */}
      {(selectedSale || lastSale) && (showConfirmation || isDetailsModalOpen) && (
        <div className="modal-overlay" onClick={() => { setShowConfirmation(false); setIsDetailsModalOpen(false); setSelectedSale(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "380px" }}>
            <div id="printable-ticket" ref={ticketRef} style={{ padding: "2rem", color: "#000", background: "#fff", fontFamily: "'Courier New', Courier, monospace" }}>
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", fontFamily: "'Playfair Display', serif" }}>VELIA</h2>
                <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>Boutique de Lujo</p>
                <div style={{ borderBottom: "1px dashed #ccc", margin: "1rem 0" }}></div>
                <p style={{ fontSize: "0.75rem" }}>Ticket: {(selectedSale || lastSale)?.id.toUpperCase()}</p>
                <p style={{ fontSize: "0.75rem" }}>Fecha: {new Date((selectedSale || lastSale)?.fecha!).toLocaleString()}</p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #eee" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Pieza</th>
                      <th style={{ textAlign: "center" }}>Cant.</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale || lastSale)?.detalles_venta.map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: "0.5rem 0" }}>{d.nombre_producto}</td>
                        <td style={{ textAlign: "center" }}>{d.cantidad}</td>
                        <td style={{ textAlign: "right" }}>${d.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: "1px dashed #ccc", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  <span>Subtotal:</span>
                  <span>${(selectedSale || lastSale)?.subtotal.toLocaleString()}</span>
                </div>
                {(selectedSale || lastSale)?.descuento! > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span>Descuento:</span>
                    <span>-${(selectedSale || lastSale)?.descuento.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                  <span>TOTAL:</span>
                  <span>${(selectedSale || lastSale)?.total.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.75rem" }}>
                <p>Método: {(selectedSale || lastSale)?.metodo_pago}</p>
                <p style={{ marginTop: "1rem" }}>¡Gracias por elegir VELIA!</p>
              </div>
            </div>
            
            <div className="modal-footer" style={{ background: "var(--background)", borderTop: "1px solid var(--glass-border)" }}>
              <button className="btn-outline" onClick={() => { setShowConfirmation(false); setIsDetailsModalOpen(false); setSelectedSale(null); }}>Cerrar</button>
              <button className="btn-emerald" onClick={handlePrint}>Imprimir Ticket</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          body * { visibility: hidden; }
          #printable-ticket, #printable-ticket * { visibility: visible; }
          #printable-ticket { position: absolute; left: 0; top: 0; width: 100%; }
          .modal-overlay { background: none; backdrop-filter: none; }
          .modal-footer { display: none; }
        }
      `}</style>
    </div>
  );
}
