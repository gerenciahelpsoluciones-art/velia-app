"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  nombre: string;
  categoria: string;
  costo: number;
  precio_venta: number;
  stock: number;
  created_at?: string;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Perfumería",
    costo: 0,
    precio_venta: 0,
    stock: 0,
  });

  const fetchProducts = async () => {
    setLoading(true);
    
    // Check role
    const isDemo = document.cookie.includes("velia_demo=true");
    if (isDemo) {
      setIsAdmin(true);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", user.id)
          .single();
        if (profile?.rol === "admin") setIsAdmin(true);
      }
    }

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre", { ascending: true });

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

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      nombre: "",
      categoria: "Perfumería",
      costo: 0,
      precio_venta: 0,
      stock: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      categoria: product.categoria,
      costo: product.costo,
      precio_venta: product.precio_venta,
      stock: product.stock,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase
          .from("productos")
          .update({
            nombre: formData.nombre,
            categoria: formData.categoria,
            costo: formData.costo,
            precio_venta: formData.precio_venta,
            stock: formData.stock
          })
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("productos").insert([formData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert("Error al guardar el producto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", productToDelete.id);
      
      if (error) throw error;

      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      alert("Error al eliminar el producto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "Todas" || p.categoria === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["Todas", "Perfumería", "Bisutería"];

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div>
          <h1 className="font-playfair">Inventario Maestro</h1>
          <p>Gestión completa de sus piezas exclusivas VELIA</p>
        </div>
        <button className="btn-emerald" onClick={openCreateModal}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Pieza
        </button>
      </header>

      {/* Toolbar: Search & Filters */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {categories.map(cat => (
              <button 
                key={cat}
                className={`filter-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: "0.85rem", opacity: 0.5 }}>
          Mostrando {filteredProducts.length} de {products.length} piezas
        </div>
      </div>

      <section className="velia-card" style={{ padding: "0" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Venta</th>
                <th>Margen</th>
                <th>Stock</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>Sincronizando inventario...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>No se encontraron piezas con estos criterios.</td></tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb-placeholder">
                          {p.categoria === "Perfumería" ? "🧴" : "💎"}
                        </div>
                        <div style={{ fontWeight: "600" }}>{p.nombre}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.categoria === 'Perfumería' ? 'badge-perfumeria' : 'badge-bisuteria'}`}>
                        {p.categoria}
                      </span>
                    </td>
                    <td style={{ opacity: 0.7 }}>${p.costo.toLocaleString('es-CO')}</td>
                    <td style={{ fontWeight: "700", color: "var(--velia-emerald)" }}>${p.precio_venta.toLocaleString('es-CO')}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--velia-success)", fontWeight: "600" }}>
                      +{p.precio_venta > 0 ? Math.round(((p.precio_venta - p.costo) / p.precio_venta) * 100) : 0}%
                    </td>
                    <td>
                      <span className={`badge ${p.stock <= 5 ? 'badge-low-stock' : 'badge-in-stock'}`}>
                        {p.stock} u.
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          <button className="edit" title="Editar" onClick={() => openEditModal(p)}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button className="delete" title="Eliminar" onClick={() => confirmDelete(p)}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2 className="font-playfair">{editingProduct ? 'Editar Pieza Exclusiva' : 'Registrar Nueva Pieza'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select 
                      className="form-select" 
                      value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                    >
                      <option value="Perfumería">Perfumería</option>
                      <option value="Bisutería">Bisutería</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Actual</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Costo (COP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={formData.costo}
                      onChange={e => setFormData({...formData, costo: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Venta (COP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={formData.precio_venta}
                      onChange={e => setFormData({...formData, precio_venta: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-emerald" disabled={loading}>
                  {loading ? 'Guardando...' : editingProduct ? 'Actualizar Pieza' : 'Guardar Pieza'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {isDeleteModalOpen && productToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2 className="font-playfair">Confirmar Eliminación</h2>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body confirm-delete-body">
              <div className="delete-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <p>¿Está seguro de eliminar <span className="product-name-delete">"{productToDelete.nombre}"</span>?</p>
              <p style={{ fontSize: "0.85rem", opacity: 0.5, marginTop: "0.5rem" }}>Esta acción no se puede deshacer y afectará el historial de ventas.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-danger" onClick={handleDelete} disabled={loading}>
                {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
