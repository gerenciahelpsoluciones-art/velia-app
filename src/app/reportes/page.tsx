"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface SaleData {
  id: string;
  total: number;
  fecha: string;
  detalles_venta: {
    nombre_producto: string;
    cantidad: number;
  }[];
}

export default function Reports() {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30"); // days

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  const fetchReports = async () => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    const { data, error } = await supabase
      .from("velia_ventas")
      .select("*, detalles_venta(nombre_producto, cantidad)")
      .gte("fecha", startDate.toISOString())
      .order("fecha", { ascending: true });

    if (data) setSales(data as any);
    setLoading(false);
  };

  // Group sales by day for the chart
  const dailySales = sales.reduce((acc: any, sale) => {
    const day = new Date(sale.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    acc[day] = (acc[day] || 0) + sale.total;
    return acc;
  }, {});

  const chartData = Object.entries(dailySales).map(([day, total]) => ({ day, total: total as number }));
  const maxSale = Math.max(...chartData.map(d => d.total), 1);

  // Top Products
  const productCount = sales.reduce((acc: any, sale) => {
    sale.detalles_venta.forEach(item => {
      acc[item.nombre_producto] = (acc[item.nombre_producto] || 0) + item.cantidad;
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productCount)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sales.map(s => ({
      ID: s.id,
      Fecha: new Date(s.fecha).toLocaleString(),
      Total: s.total,
      Productos: s.detalles_venta.map(d => `${d.nombre_producto} (x${d.cantidad})`).join(", ")
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `Reporte_VELIA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Reportes y Analíticas</h1>
          <p style={{ opacity: 0.6 }}>Rendimiento operativo de VELIA Premium</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <select 
            className="form-select" 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ width: "160px" }}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          <button className="btn-outline" onClick={exportExcel} disabled={loading}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar Excel
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* CHART VELIA CUSTOM */}
        <div className="velia-card" style={{ minHeight: "450px", display: "flex", flexDirection: "column" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.3rem", marginBottom: "2rem" }}>Ventas Diarias (COP)</h2>
          
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "10px", paddingBottom: "2rem", position: "relative" }}>
            {loading ? (
              <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.5 }}>Cargando datos...</p>
            ) : chartData.length === 0 ? (
              <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.5 }}>No hay datos para este período.</p>
            ) : (
              chartData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div 
                    title={`${d.day}: $${d.total.toLocaleString()}`}
                    style={{ 
                      width: "100%", 
                      height: `${(d.total / maxSale) * 250}px`, 
                      background: "var(--velia-emerald-gradient)",
                      borderRadius: "6px 6px 0 0",
                      transition: "height 1s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      minHeight: "2px"
                    }} 
                  >
                    <div style={{
                      position: "absolute", top: "-25px", left: "50%", transform: "translateX(-50%)",
                      fontSize: "0.7rem", fontWeight: "700", whiteSpace: "nowrap", opacity: 0, transition: "opacity 0.2s"
                    }} className="chart-label">
                      ${Math.round(d.total / 1000)}k
                    </div>
                  </div>
                  <span style={{ fontSize: "0.65rem", opacity: 0.4, transform: "rotate(-45deg)", marginTop: "10px", whiteSpace: "nowrap" }}>{d.day}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="velia-card">
          <h2 className="font-playfair" style={{ fontSize: "1.3rem", marginBottom: "1.5rem" }}>Top Piezas</h2>
          <ul style={{ listStyle: "none" }}>
            {loading ? (
               <li style={{ padding: "1rem 0", opacity: 0.5 }}>Calculando...</li>
            ) : topProducts.length === 0 ? (
              <li style={{ padding: "1rem 0", opacity: 0.5 }}>Sin datos de ventas.</li>
            ) : (
              topProducts.map(([name, count]: any, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", padding: "1.2rem 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--velia-rose-gold)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "800" }}>{i+1}</span>
                    <span style={{ fontWeight: "500" }}>{name}</span>
                  </div>
                  <span style={{ fontWeight: "700", color: "var(--velia-emerald)" }}>{count} u.</span>
                </li>
              ))
            )}
          </ul>

          <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(6, 78, 59, 0.03)", borderRadius: "12px" }}>
            <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.5rem" }}>Venta Total del Período</p>
            <p className="font-playfair" style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--velia-emerald)" }}>
              ${chartData.reduce((a, b) => a + b.total, 0).toLocaleString("es-CO")}
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .velia-card div:hover .chart-label {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
