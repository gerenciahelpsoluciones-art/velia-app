"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Supplier {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  telefono: string;
  ultimo_pedido?: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Perfumería",
    contacto: "",
    telefono: ""
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Check role
    const isDemo = document.cookie.includes("velia_demo=true");
    if (isDemo) {
      setIsAdmin(true);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("velia_perfiles")
          .select("rol")
          .eq("id", user.id)
          .single();
        if (profile?.rol === "admin") setIsAdmin(true);
      }
    }

    const { data, error } = await supabase.from("velia_proveedores").select("*").order("nombre");
    if (data) {
      setSuppliers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      nombre: "",
      categoria: "Perfumería",
      contacto: "",
      telefono: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      nombre: supplier.nombre,
      categoria: supplier.categoria,
      contacto: supplier.contacto,
      telefono: supplier.telefono
    });
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("velia_proveedores")
          .update(formData)
          .eq("id", editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("velia_proveedores").insert([formData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar el proveedor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("velia_proveedores")
        .delete()
        .eq("id", supplierToDelete.id);
      
      if (error) throw error;

      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
      fetchData();
    } catch (err: any) {
      alert("Error al eliminar el proveedor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contacto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div>
          <h1 className="font-playfair">Soclis y Proveedores</h1>
          <p>Gestión de alianzas estratégicas y suministros de lujo</p>
        </div>
        {isAdmin && (
          <button className="btn-emerald" onClick={openCreateModal}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo Socio
          </button>
        )}
      </header>

      <section className="velia-card" style={{ padding: "0" }}>
        <div style={{ padding: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>Directorio Activo</h2>
          <div className="search-bar">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Buscar por nombre o contacto..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa / Marca</th>
                <th>Especialidad</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Último Pedido</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading && suppliers.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>Consultando directorio...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>No se encontraron socios.</td></tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: "700", color: "var(--velia-emerald)" }}>{s.nombre}</div></td>
                    <td>
                      <span className={`badge ${s.categoria === 'Perfumería' ? 'badge-perfumeria' : s.categoria === 'Bisutería' ? 'badge-bisuteria' : ''}`}>
                        {s.categoria}
                      </span>
                    </td>
                    <td>{s.contacto}</td>
                    <td style={{ opacity: 0.7 }}>{s.telefono}</td>
                    <td style={{ fontSize: "0.85rem", opacity: 0.5 }}>{s.ultimo_pedido || "Sin historial"}</td>
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          <button className="edit" onClick={() => openEditModal(s)}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button className="delete" onClick={() => confirmDelete(s)}>
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
              <h2 className="font-playfair">{editingSupplier ? 'Actualizar Socio' : 'Añadir Nuevo Socio'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Empresa / Marca</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría Especializada</label>
                  <select 
                    className="form-select" 
                    value={formData.categoria}
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                  >
                    <option value="Perfumería">Perfumería</option>
                    <option value="Bisutería">Bisutería</option>
                    <option value="Insumos">Insumos y Empaques</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contacto Principal</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.contacto}
                      onChange={e => setFormData({...formData, contacto: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.telefono}
                      onChange={e => setFormData({...formData, telefono: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-emerald" disabled={loading}>
                  {loading ? 'Guardando...' : editingSupplier ? 'Actualizar Datos' : 'Registrar Socio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {isDeleteModalOpen && supplierToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h2 className="font-playfair">Eliminar Proveedor</h2>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body confirm-delete-body">
              <div className="delete-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <p>¿Seguro que desea eliminar a <span className="product-name-delete">"{supplierToDelete.nombre}"</span>?</p>
              <p style={{ fontSize: "0.85rem", opacity: 0.5, marginTop: "0.5rem" }}>Se perderá la información de contacto de este proveedor.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={loading}>
                {loading ? 'Eliminando...' : 'Eliminar Socio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
