import { Sidebar } from "./components/Sidebar";
import { MobileHeader } from "./components/MobileHeader";
import { BottomNav } from "./components/NavItems";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
      Desktop (≥md): sidebar fissa a sinistra + content scrollabile a destra
      Mobile (<md):  header fisso in cima + content + bottom nav fisso in fondo
    */
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto bg-slate-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>

        <div className="md:hidden shrink-0">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
