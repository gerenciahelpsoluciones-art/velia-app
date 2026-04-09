"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
  estado: "activo" | "inactivo";
  created_at: string;
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "vendedor" as "admin" | "vendedor",
  });
  const [error, setError] = useState("");

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("velia_perfiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      // Fallback data for demo if table doesn't exist yet
      if (error.code === "42P01") {
        setProfiles([
          { id: "1", nombre: "Admin VELIA", email: "admin@velia.com", rol: "admin", estado: "activo", created_at: new Date().toISOString() },
          { id: "2", nombre: "Vendedor Test", email: "vendedor@velia.com", rol: "vendedor", estado: "activo", created_at: new Date().toISOString() },
        ]);
      }
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Llamar a nuestra API de creación manual
      const response = await fetch("/api/usuarios/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error);
      
      setIsModalOpen(false);
      setNewUser({ nombre: "", email: "", password: "", rol: "vendedor" });
      fetchProfiles();
      alert("Usuario creado exitosamente. Ya puede iniciar sesión.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "activo" ? "inactivo" : "activo";
    const { error } = await supabase
      .from("perfiles")
      .update({ estado: newStatus })
      .eq("id", id);
    
    if (!error) fetchProfiles();
  };

  return (
    <div className="animate-fade">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 className="font-playfair" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Gestión de Equipo</h1>
          <p style={{ opacity: 0.6 }}>Administre accesos y roles del personal de VELIA</p>
        </div>
        <button className="btn-emerald" onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Nuevo Usuario
        </button>
      </header>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="velia-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.5rem" }}>Total Usuarios</p>
          <p className="font-playfair" style={{ fontSize: "2rem", fontWeight: "700" }}>{profiles.length}</p>
        </div>
        <div className="velia-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.5rem" }}>Administradores</p>
          <p className="font-playfair" style={{ fontSize: "2rem", fontWeight: "700", color: "var(--velia-rose-gold)" }}>
            {profiles.filter(p => p.rol === "admin").length}
          </p>
        </div>
        <div className="velia-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "0.5rem" }}>Vendedores</p>
          <p className="font-playfair" style={{ fontSize: "2rem", fontWeight: "700", color: "var(--velia-emerald)" }}>
            {profiles.filter(p => p.rol === "vendedor").length}
          </p>
        </div>
      </div>

      <section className="velia-card" style={{ padding: "0" }}>
        <div style={{ padding: "1.75rem" }}>
          <h2 className="font-playfair" style={{ fontSize: "1.5rem" }}>Lista de Personal</h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>Cargando personal...</td></tr>
              ) : profiles.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>No hay usuarios registrados.</td></tr>
              ) : (
                profiles.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: "600" }}>{p.nombre}</td>
                    <td style={{ opacity: 0.7 }}>{p.email}</td>
                    <td>
                      <span style={{ 
                        padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.7rem", fontWeight: "700",
                        background: p.rol === "admin" ? "rgba(183, 110, 121, 0.1)" : "rgba(6, 78, 59, 0.1)",
                        color: p.rol === "admin" ? "var(--velia-rose-gold)" : "var(--velia-emerald)"
                      }}>
                        {p.rol.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem",
                        color: p.estado === "activo" ? "var(--velia-success)" : "var(--velia-danger)"
                      }}>
                        <span style={{ 
                          width: "8px", height: "8px", borderRadius: "50%", 
                          background: p.estado === "activo" ? "var(--velia-success)" : "var(--velia-danger)",
                          boxShadow: p.estado === "activo" ? "0 0 8px var(--velia-success)" : "none"
                        }}></span>
                        {p.estado.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleStatus(p.id, p.estado)}
                        className="btn-outline" 
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {p.estado === "activo" ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Nuevo Usuario */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2 className="font-playfair">Registrar Nuevo Miembro</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                {error && <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "0.75rem", borderRadius: "10px", marginBottom: "1rem", fontSize: "0.85rem" }}>{error}</div>}
                
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required
                    value={newUser.nombre}
                    onChange={e => setNewUser({...newUser, nombre: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Personal / Corporativo</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña Provisoria</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol Asignado</label>
                  <select 
                    className="form-select"
                    value={newUser.rol}
                    onChange={e => setNewUser({...newUser, rol: e.target.value as "admin" | "vendedor"})}
                  >
                    <option value="vendedor">Vendedor (Acceso limitado)</option>
                    <option value="admin">Administrador (Acceso total)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-emerald" disabled={loading}>
                  {loading ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
