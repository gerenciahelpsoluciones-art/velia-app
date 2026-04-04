"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Inter, Playfair_Display } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check for demo mode cookie
    const isDemo = document.cookie.includes("velia_demo=true");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session || (isDemo ? { user: { email: "admin@velia.com", user_metadata: { full_name: "Admin VELIA" } } } : null));
      setLoading(false);
      if (!session && !isDemo && pathname !== "/login" && pathname !== "/setup") {
        router.push("/login");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || (isDemo ? { user: { email: "admin@velia.com", user_metadata: { full_name: "Admin VELIA" } } } : null));
      if (!session && !isDemo && pathname !== "/login" && pathname !== "/setup") {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const isLoginPage = pathname === "/login";

  if (loading) {
    return (
      <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
        <body style={{ 
          background: "var(--background)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          height: "100vh",
          color: "var(--velia-emerald)" 
        }}>
          <div className="font-playfair" style={{ fontSize: "1.5rem", opacity: 0.5 }}>Cargando VELIA...</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className={isLoginPage ? "" : "app-layout"}>
        {!isLoginPage && session && <Sidebar />}
        <main className={isLoginPage ? "" : "main-content"}>
          {children}
        </main>
      </body>
    </html>
  );
}
