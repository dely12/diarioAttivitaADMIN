import { createClient } from "@/lib/supabase/server";

export async function MobileHeader() {
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
    <header className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
      <div>
        <span className="text-sm font-bold text-slate-900">Diario Attività</span>
        <span className="ml-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">
          Admin
        </span>
      </div>
      <span className="text-xs text-slate-500 truncate max-w-32">{name}</span>
    </header>
  );
}
