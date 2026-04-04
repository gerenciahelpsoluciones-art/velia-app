"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  category: "Perfumería" | "Bisutería";
  costPrice: number;
  salePrice: number;
  stock: number;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    category: "Perfumería",
    costPrice: 0,
    salePrice: 0,
    stock: 0,
  });

  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = {
      nombre: newProduct.name,
      categoria: newProduct.category,
      costo: newProduct.costPrice,
      precio_venta: newProduct.salePrice,
      stock: newProduct.stock,
    };

    const { error } = await supabase.from("productos").insert([product]);

    if (error) {
      alert("Error al guardar el producto: " + error.message);
    } else {
      setIsModalOpen(false);
      setNewProduct({ name: "", category: "Perfumería", costPrice: 0, salePrice: 0, stock: 0 });
      fetchProducts();
    }
  };

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Inventario Maestro</h1>
          <p style={{ opacity: 0.6 }}>Gestión completa de sus piezas exclusivas</p>
        </div>
        <button className="btn-emerald" onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Pieza
        </button>
      </header>

      <section className="velia-card" style={{ padding: "0" }}>
        <div style={{ padding: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>Todas las Piezas</h2>
          <input type="text" className="form-input" placeholder="Buscar..." style={{ width: "250px" }} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Venta</th>
                <th>Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
                    Cargando inventario...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
                    No hay productos registrados.
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name || (p as any).nombre}</td>
                    <td>{p.category || (p as any).categoria}</td>
                    <td>${Number(p.costPrice || (p as any).costo).toLocaleString('es-CO')}</td>
                    <td>${Number(p.salePrice || (p as any).precio_venta).toLocaleString('es-CO')}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span style={{ 
                        color: p.stock > 0 ? "var(--velia-success)" : "var(--velia-danger)",
                        fontSize: "0.8rem",
                        fontWeight: "700"
                      }}>
                        {p.stock > 0 ? "DISPONIBLE" : "AGOTADO"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-playfair">Registrar Nueva Pieza</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej: Chanel N°5 100ml"
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select 
                      className="form-select"
                      required
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value as "Perfumería" | "Bisutería"})}
                    >
                      <option value="Perfumería">Perfumería</option>
                      <option value="Bisutería">Bisutería</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Inicial</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0"
                      required
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Costo (COP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0"
                      required
                      value={newProduct.costPrice}
                      onChange={e => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Venta (COP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0"
                      required
                      value={newProduct.salePrice}
                      onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="photo-upload">
                  <div className="photo-upload-icon">
                    <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="photo-upload-text">Subir imagen de la pieza (Opcional)</p>
                  <p className="photo-upload-text" style={{ fontSize: "0.75rem" }}>Arrastra o haz clic para seleccionar</p>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-emerald">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
