"use client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AuthRedirect } from "@/components/auth-redirect";
import { useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthRedirect>
      <div className="min-h-screen">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="pl-0 lg:pl-64">
          <Header mobileOpen={mobileOpen} onToggle={() => setMobileOpen(!mobileOpen)} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthRedirect>
  );
}
