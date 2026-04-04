"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Setup() {
  const [email, setEmail] = useState("admin@velia.com");
  const [password, setPassword] = useState("admin123456");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    setStatus("loading");
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: "Administrador VELIA",
        }
      }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("¡Usuario creado exitosamente! Ya puedes loguearte con este correo y clave.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#022c22",
      color: "white",
      padding: "2rem",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{ 
        background: "rgba(255,255,255,0.05)", 
        padding: "3rem", 
        borderRadius: "20px", 
        maxWidth: "400px", 
        width: "100%",
        border: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center"
      }}>
        <h1 style={{ marginBottom: "1.5rem" }}>Configuración VELIA</h1>
        <p style={{ opacity: 0.6, marginBottom: "2rem" }}>Crea tu cuenta de administrador principal.</p>

        <div style={{ marginBottom: "1rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.8rem", opacity: 0.5 }}>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem", borderRadius: "10px", border: "none", background: "white", color: "black" }}
          />
        </div>

        <div style={{ marginBottom: "2rem", textAlign: "left" }}>
          <label style={{ fontSize: "0.8rem", opacity: 0.5 }}>Password</label>
          <input 
            type="text" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem", borderRadius: "10px", border: "none", background: "white", color: "black" }}
          />
        </div>

        <button 
          onClick={handleCreate} 
          disabled={status === "loading"}
          style={{ width: "100%", padding: "1rem", background: "#b76e79", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
        >
          {status === "loading" ? "Creando..." : "Crear Usuario Admin"}
        </button>

        {message && (
          <p style={{ marginTop: "1.5rem", color: status === "error" ? "#f87171" : "#4ade80", fontSize: "0.9rem" }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem", opacity: 0.3 }}>
          Borra este archivo (src/app/setup/page.tsx) después de crear al usuario.
        </div>
      </div>
    </div>
  );
}
