"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Supplier {
  id: string;
  name: string;
  category: "Perfumería" | "Bisutería" | "Insumos";
  contact: string;
  phone: string;
  lastOrder: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: "",
    category: "Perfumería",
    contact: "",
    phone: ""
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("proveedores").select("*").order("nombre");
    if (data) {
      setSuppliers(data.map(s => ({
        id: s.id,
        name: s.nombre,
        category: s.categoria,
        contact: s.contacto,
        phone: s.telefono,
        lastOrder: s.ultimo_pedido
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("proveedores").insert([{
      nombre: newSupplier.name,
      categoria: newSupplier.category,
      contacto: newSupplier.contact,
      telefono: newSupplier.phone
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewSupplier({ name: "", category: "Perfumería", contact: "", phone: "" });
      fetchSuppliers();
    }
  };

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Directorio de Proveedores</h1>
          <p style={{ opacity: 0.6 }}>Gestión de socios comerciales exclusivos</p>
        </div>
        <button className="btn-emerald" onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Proveedor
        </button>
      </header>

      <section className="velia-card" style={{ padding: "0" }}>
        <div style={{ padding: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>Lista de Proveedores</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input type="text" className="form-input" placeholder="Buscar socio..." style={{ width: "200px", padding: "0.5rem 1rem" }} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Contacto Principal</th>
                <th>Teléfono</th>
                <th>Último Pedido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", opacity: 0.5 }}>Cargando...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", opacity: 0.5 }}>No hay proveedores registrados.</td></tr>
              ) : (
                suppliers.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: "600" }}>{s.name}</div></td>
                    <td>
                      <span style={{ 
                        padding: "0.3rem 0.8rem", 
                        borderRadius: "100px", 
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: "rgba(183, 110, 121, 0.08)",
                        color: "var(--velia-rose-gold)"
                      }}>
                        {s.category}
                      </span>
                    </td>
                    <td>{s.contact}</td>
                    <td>{s.phone}</td>
                    <td>{s.lastOrder || "Sin pedidos"}</td>
                    <td>
                      <button className="btn-icon">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal para Nuevo Proveedor */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-playfair">Registrar Nuevo Socio</h2>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Empresa</label>
                  <input type="text" className="form-input" required value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-select" value={newSupplier.category} onChange={e => setNewSupplier({...newSupplier, category: e.target.value as any})}>
                      <option value="Perfumería">Perfumería</option>
                      <option value="Bisutería">Bisutería</option>
                      <option value="Insumos">Insumos</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Persona de Contacto</label>
                    <input type="text" className="form-input" value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input type="text" className="form-input" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-emerald">Guardar Socio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
