import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./NavItems";
import { LogOut } from "lucide-react";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dipendente } = await supabase
    .from("dipendenti")
    .select("nomedipendente")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const name = dipendente?.nomedipendente ?? user?.email ?? "";

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
      {/* Logo / titolo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="text-sm font-bold text-slate-900 leading-tight">
          Diario Attività
        </div>
        <div className="text-xs text-blue-700 font-semibold tracking-wide uppercase mt-0.5">
          Admin
        </div>
      </div>

      {/* Navigazione */}
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>

      {/* Footer utente */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="text-xs font-medium text-slate-700 truncate">{name}</div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={13} />
            Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
