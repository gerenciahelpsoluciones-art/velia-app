"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  category: "Perfumería" | "Bisutería";
  costPrice: number;
  salePrice: number;
  stock: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [todaySales, setTodaySales] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Products
      const { data: prodData } = await supabase.from("productos").select("*");
      if (prodData) setProducts(prodData.map(p => ({
        id: p.id,
        name: p.nombre,
        category: p.categoria,
        costPrice: p.costo,
        salePrice: p.precio_venta,
        stock: p.stock
      })));

      // Fetch Recent Sales for Activity
      const { data: salesData } = await supabase
        .from("ventas")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(5);
      if (salesData) setRecentActivity(salesData);

      // Fetch Today's Sales
      const today = new Date();
      today.setHours(0,0,0,0);
      const { data: todayData } = await supabase
        .from("ventas")
        .select("total")
        .gte("fecha", today.toISOString());
      
      if (todayData) {
        const total = todayData.reduce((acc, s) => acc + s.total, 0);
        setTodaySales(total);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const totalValue = products.reduce((acc, p) => acc + (Number(p.costPrice) * Number(p.stock)), 0);
  const potentialRevenue = products.reduce((acc, p) => acc + (Number(p.salePrice) * Number(p.stock)), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "1.5rem" }}>
        <div className="premium-loader"></div>
        <p className="font-playfair" style={{ opacity: 0.5, letterSpacing: "2px" }}>SINCRONIZANDO VELIA...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Panel de Control</h1>
          <p style={{ opacity: 0.6 }}>Resumen ejecutivo de la marca</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/ventas" className="btn-emerald">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Nueva Venta
          </Link>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
        <div className="velia-card stat-card">
          <div className="stat-icon emerald">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="stat-label">Ventas de Hoy</p>
          <p className="stat-value" style={{ color: "var(--velia-emerald)" }}>${todaySales.toLocaleString('es-CO')}</p>
          <div className="stat-change positive">
            <span className="pulse-dot"></span> sesión activa
          </div>
        </div>
        
        <div className="velia-card stat-card">
          <div className="stat-icon gold">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <p className="stat-label">Valor en Inventario</p>
          <p className="stat-value">${totalValue.toLocaleString('es-CO')}</p>
          <p style={{ fontSize: "0.75rem", opacity: 0.4 }}>{products.length} productos registrados</p>
        </div>

        <div className="velia-card stat-card">
          <div className="stat-icon rose">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <p className="stat-label">Ingreso proyectado</p>
          <p className="stat-value">${potentialRevenue.toLocaleString('es-CO')}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--velia-rose-gold)", fontWeight: "600" }}>
             Rentabilidad: ${ (potentialRevenue - totalValue).toLocaleString('es-CO') }
          </p>
        </div>

        <div className="velia-card stat-card">
          <div className="stat-icon info">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p className="stat-label">Margen Promedio</p>
          <p className="stat-value">{products.length ? Math.round(((potentialRevenue - totalValue) / potentialRevenue) * 100) : 0}%</p>
          <p style={{ fontSize: "0.75rem", opacity: 0.4 }}>Basado en precios actuales</p>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div className="velia-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 className="font-playfair" style={{ fontSize: "1.3rem" }}>Actividad Reciente</h3>
            <Link href="/ventas" style={{ fontSize: "0.75rem", color: "var(--velia-rose-gold)", fontWeight: "600" }}>Ver todo</Link>
          </div>
          <ul style={{ listStyle: "none" }}>
            {recentActivity.length === 0 ? (
              <li style={{ padding: "0.8rem 0", opacity: 0.5, fontStyle: "italic" }}>No hay ventas registradas aún.</li>
            ) : (
              recentActivity.map(sale => (
                <li key={sale.id} style={{ 
                  padding: "1rem 0", 
                  borderBottom: "1px solid var(--glass-border)", 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <p style={{ fontSize: "0.9rem", fontWeight: "600" }}>Venta en {sale.metodo_pago}</p>
                    <p style={{ fontSize: "0.7rem", opacity: 0.4 }}>{new Date(sale.fecha).toLocaleString()}</p>
                  </div>
                  <span style={{ 
                    color: "var(--velia-emerald)", 
                    fontWeight: "700",
                    background: "rgba(6, 78, 59, 0.05)",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.9rem"
                  }}>
                    ${sale.total.toLocaleString("es-CO")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="velia-card">
          <h3 className="font-playfair" style={{ fontSize: "1.3rem", marginBottom: "1.5rem" }}>Alertas de Inventario</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {products.filter(p => p.stock <= 5).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", opacity: 0.4 }}>
                <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: "0.5rem" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Niveles de stock óptimos</p>
              </div>
            ) : (
              products.filter(p => p.stock <= 5).map(p => (
                <div key={p.id} style={{ 
                  padding: "1rem", 
                  background: "rgba(239, 68, 68, 0.04)", 
                  borderRadius: "12px",
                  border: "1px solid rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>{p.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--velia-danger)" }}>Solo quedan {p.stock} unidades</p>
                  </div>
                  <Link href="/inventario" className="btn-icon" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--velia-success);
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
          box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .premium-loader {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(6, 78, 59, 0.1);
          border-top: 3px solid var(--velia-emerald);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
