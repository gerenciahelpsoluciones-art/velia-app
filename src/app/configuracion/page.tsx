"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

interface ExcelRow {
  nombre?: string;
  Nombre?: string;
  producto?: string;
  Producto?: string;
  categoria?: string;
  Categoría?: string;
  Categoria?: string;
  costo?: number;
  Costo?: number;
  "precio costo"?: number;
  "Precio Costo"?: number;
  venta?: number;
  Venta?: number;
  "precio venta"?: number;
  "Precio Venta"?: number;
  stock?: number;
  Stock?: number;
  cantidad?: number;
  Cantidad?: number;
  [key: string]: string | number | undefined;
}

interface Product {
  id: string;
  name: string;
  category: "Perfumería" | "Bisutería";
  costPrice: number;
  salePrice: number;
  stock: number;
}

export default function Settings() {
  const [storeName, setStoreName] = useState("VELIA Premium");
  const [currency, setCurrency] = useState("COP");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error" | "preview">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [previewData, setPreviewData] = useState<Product[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setUploadStatus("error");
          setUploadMessage("El archivo está vacío. Asegúrese de que tenga datos en la primera hoja.");
          return;
        }

        // Map flexible column names to our Product structure
        const products: Product[] = jsonData.map((row, index) => {
          const name = row.nombre || row.Nombre || row.producto || row.Producto || row.name || row.Name || "";
          const categoryRaw = row.categoria || row.Categoría || row.Categoria || row.category || "";
          const costPrice = row.costo || row.Costo || row["precio costo"] || row["Precio Costo"] || row.costPrice || row.cost || 0;
          const salePrice = row.venta || row.Venta || row["precio venta"] || row["Precio Venta"] || row.salePrice || row.price || 0;
          const stock = row.stock || row.Stock || row.cantidad || row.Cantidad || 0;

          let category: "Perfumería" | "Bisutería" = "Perfumería";
          if (typeof categoryRaw === "string") {
            const lower = categoryRaw.toLowerCase();
            if (lower.includes("bisut") || lower.includes("joy") || lower.includes("acces")) {
              category = "Bisutería";
            }
          }

          return {
            id: `excel_${Date.now()}_${index}`,
            name: String(name),
            category,
            costPrice: Number(costPrice) || 0,
            salePrice: Number(salePrice) || 0,
            stock: Number(stock) || 0,
          };
        }).filter(p => p.name.trim() !== "");

        if (products.length === 0) {
          setUploadStatus("error");
          setUploadMessage("No se encontraron productos válidos. Revise que las columnas se llamen: Nombre, Categoría, Costo, Venta, Stock.");
          return;
        }

        setPreviewData(products);
        setUploadStatus("preview");
        setUploadMessage(`Se encontraron ${products.length} productos listos para importar.`);
      } catch {
        setUploadStatus("error");
        setUploadMessage("Error al leer el archivo. Asegúrese de que sea un archivo Excel válido (.xlsx o .xls).");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelFile(file);
  };

  const confirmImport = async () => {
    setUploadStatus("idle");
    setUploadMessage("Importando datos...");
    
    try {
      const rowsToInsert = previewData.map(p => ({
        nombre: p.name,
        categoria: p.category,
        costo: p.costPrice,
        precio_venta: p.salePrice,
        stock: p.stock
      }));

      const { error } = await supabase.from("productos").insert(rowsToInsert);
      if (error) throw error;

      setUploadStatus("success");
      setUploadMessage(`¡${previewData.length} productos importados exitosamente!`);
      setPreviewData([]);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMessage("Error al importar: " + err.message);
    }
  };

  const replaceImport = async () => {
    if (!confirm("¿Está seguro de reemplazar TODO el inventario? Esta acción no se puede deshacer.")) return;
    
    setUploadStatus("idle");
    setUploadMessage("Reemplazando inventario...");

    try {
      // 1. Delete all existing products
      const { error: deleteError } = await supabase.from("productos").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Hack to delete all in RLS
      if (deleteError) throw deleteError;

      // 2. Insert new products
      const rowsToInsert = previewData.map(p => ({
        nombre: p.name,
        categoria: p.category,
        costo: p.costPrice,
        precio_venta: p.salePrice,
        stock: p.stock
      }));

      const { error: insertError } = await supabase.from("productos").insert(rowsToInsert);
      if (insertError) throw insertError;

      setUploadStatus("success");
      setUploadMessage(`¡Inventario reemplazado con ${previewData.length} productos nuevos!`);
      setPreviewData([]);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMessage("Error al reemplazar: " + err.message);
    }
  };

  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadMessage("");
    setPreviewData([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const templateData = [
      { Nombre: "Chanel N°5 100ml", Categoría: "Perfumería", Costo: 80000, Venta: 150000, Stock: 12 },
      { Nombre: "Collar Zafiro Premium", Categoría: "Bisutería", Costo: 45000, Venta: 120000, Stock: 5 },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    // Set column widths
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];

    XLSX.writeFile(wb, "VELIA_Plantilla_Inventario.xlsx");
  };

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Administración y Configuración</h1>
          <p style={{ opacity: 0.6 }}>Ajustes generales de la marca y sistema</p>
        </div>
      </header>

      {/* ── CARGA DE INVENTARIO EXCEL ── */}
      <section className="velia-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>
            <span style={{ marginRight: "0.5rem" }}>📊</span>
            Carga Masiva de Inventario
          </h2>
          <button className="btn-outline" onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Descargar Plantilla
          </button>
        </div>
        <p style={{ opacity: 0.6, marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Suba un archivo Excel (.xlsx) con las columnas: <strong>Nombre</strong>, <strong>Categoría</strong>, <strong>Costo</strong>, <strong>Venta</strong>, <strong>Stock</strong>.
        </p>

        {/* Drop Zone */}
        <div 
          className={`excel-upload-zone ${isDragging ? "dragging" : ""} ${uploadStatus === "success" ? "success" : ""} ${uploadStatus === "error" ? "error" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--velia-emerald)" : uploadStatus === "error" ? "var(--velia-danger)" : uploadStatus === "success" ? "var(--velia-success)" : "var(--glass-border)"}`,
            borderRadius: "16px",
            padding: "2.5rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            background: isDragging ? "rgba(6, 78, 59, 0.04)" : uploadStatus === "success" ? "rgba(16, 185, 129, 0.04)" : "transparent",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {uploadStatus === "idle" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <svg width="48" height="48" fill="none" stroke="var(--velia-emerald)" viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.3rem" }}>
                Arrastra tu archivo Excel aquí
              </p>
              <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>o haz clic para seleccionar (.xlsx, .xls, .csv)</p>
            </>
          )}

          {uploadStatus === "error" && (
            <>
              <div style={{ marginBottom: "1rem", color: "var(--velia-danger)" }}>
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p style={{ fontWeight: "600", color: "var(--velia-danger)" }}>{uploadMessage}</p>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); resetUpload(); }} style={{ marginTop: "1rem" }}>
                Intentar de nuevo
              </button>
            </>
          )}

          {uploadStatus === "success" && (
            <>
              <div style={{ marginBottom: "1rem", color: "var(--velia-success)" }}>
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ fontWeight: "600", color: "var(--velia-success)" }}>{uploadMessage}</p>
              <button className="btn-outline" onClick={(e) => { e.stopPropagation(); resetUpload(); }} style={{ marginTop: "1rem" }}>
                Subir otro archivo
              </button>
            </>
          )}

          {uploadStatus === "preview" && (
            <p style={{ fontWeight: "600", color: "var(--velia-emerald)" }}>
              📎 {fileName} — {uploadMessage}
            </p>
          )}
        </div>

        {/* Preview Table */}
        {uploadStatus === "preview" && previewData.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Vista previa de importación</h3>
            <div style={{ overflowX: "auto", maxHeight: "300px", overflowY: "auto", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Costo</th>
                    <th>Venta</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((p, i) => (
                    <tr key={i}>
                      <td style={{ opacity: 0.5 }}>{i + 1}</td>
                      <td>{p.name}</td>
                      <td>
                        <span style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "100px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: p.category === "Perfumería" ? "rgba(6, 78, 59, 0.08)" : "rgba(183, 110, 121, 0.08)",
                          color: p.category === "Perfumería" ? "var(--velia-emerald)" : "var(--velia-rose-gold)"
                        }}>
                          {p.category}
                        </span>
                      </td>
                      <td>${p.costPrice.toLocaleString("es-CO")}</td>
                      <td>${p.salePrice.toLocaleString("es-CO")}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.length > 20 && (
              <p style={{ textAlign: "center", opacity: 0.5, marginTop: "0.5rem", fontSize: "0.85rem" }}>
                ...y {previewData.length - 20} productos más
              </p>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button className="btn-outline" onClick={resetUpload}>Cancelar</button>
              <button className="btn-outline" onClick={replaceImport} style={{ color: "var(--velia-danger)", borderColor: "var(--velia-danger)" }}>
                Reemplazar Inventario
              </button>
              <button className="btn-emerald" onClick={confirmImport}>
                Agregar al Inventario Existente
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── CONFIGURACIÓN GENERAL ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem" }}>
        <div className="velia-card">
          <h2 className="font-playfair" style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Identidad de Marca</h2>
          
          <div className="form-group">
            <label className="form-label">Nombre de la Tienda</label>
            <input 
              type="text" 
              className="form-input" 
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Logo Principal</label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <img src="/logo.png" alt="VELIA Logo" style={{ width: "64px", height: "64px", borderRadius: "12px", border: "1px solid var(--glass-border)" }} />
              <button className="btn-outline">Cambiar Logo</button>
            </div>
          </div>
        </div>

        <div className="velia-card">
          <h2 className="font-playfair" style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Preferencias de Localización</h2>
          
          <div className="form-group">
            <label className="form-label">Moneda del Sistema</label>
            <select 
              className="form-select" 
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="COP">Peso Colombiano (COP)</option>
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: "2rem" }}>
            <button className="btn-emerald" style={{ width: "100%" }}>Guardar Cambios</button>
          </div>
        </div>
      </section>
    </div>
  );
}
