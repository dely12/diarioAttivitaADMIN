import { createClient } from "@/lib/supabase/server";
import { RegistroClient } from "./RegistroClient";
import type { DayData, DipGroup, AttivitaOption, CommessaOption } from "./RegistroClient";

export const dynamic = "force-dynamic";

// ── Date helpers (no timezone issues: parse as local) ────────────────────────
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayOfWeek(): string {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function parseFrom(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return getMondayOfWeek();
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const fromDate = parseFrom(from);
  const toDate = addDays(fromDate, 7);

  const supabase = await createClient();

  const [
    { data: entriesData, error },
    { data: dipendentiData },
    { data: attivitaData },
    { data: commesseData },
  ] = await Promise.all([
    supabase
      .from("v_admin_all_entries")
      .select("*")
      .gte("day_date", fromDate)
      .lt("day_date", toDate)
      .order("day_date", { ascending: true })
      .order("dipendente"),
    supabase
      .from("dipendenti")
      .select("user_id, nomedipendente")
      .eq("attivo", true)
      .eq("role", "USER")
      .order("nomedipendente"),
    supabase
      .from("attivita")
      .select("codattivita, descrizione, tipoassenza")
      .eq("attiva", true)
      .order("codattivita"),
    supabase
      .from("commesse")
      .select("codcommessa, descrizione")
      .eq("attiva", true)
      .order("codcommessa", { ascending: false }),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="gf-h1 mb-2">Registro Attività</h1>
        <div className="gf-error">Errore caricamento dati: {error.message}</div>
      </div>
    );
  }

  const dipendenti = dipendentiData ?? [];
  const entries = entriesData ?? [];

  // Build set of absence-type activity codes for breakdown computation
  const absenceCodes = new Set(
    (attivitaData ?? [])
      .filter((a) => a.tipoassenza)
      .map((a) => a.codattivita)
  );

  // Build 7-day structure — descending order (most recent first)
  const days: DayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(fromDate, i);
    const dayEntries = entries.filter((e) => e.day_date === dateStr);

    const dipGroups: DipGroup[] = dipendenti.map((dip) => {
      const dipEntries = dayEntries.filter((e) => e.user_id === dip.user_id);

      const activity_minutes = dipEntries
        .filter((e) => !absenceCodes.has(e.cod_attivita ?? ""))
        .reduce((sum, e) => sum + (e.minutes ?? 0), 0);

      const absence_minutes = dipEntries
        .filter((e) => absenceCodes.has(e.cod_attivita ?? ""))
        .reduce((sum, e) => sum + (e.minutes ?? 0), 0);

      return {
        user_id: dip.user_id,
        dipendente: dip.nomedipendente ?? "",
        day_id: dipEntries[0]?.day_id ?? null,
        day_status: dipEntries[0]?.day_status ?? null,
        total_minutes: activity_minutes + absence_minutes,
        activity_minutes,
        absence_minutes,
        entries: dipEntries.map((e) => ({
          entry_id: e.entry_id!,
          cod_attivita: e.cod_attivita ?? "",
          attivita: e.attivita ?? "",
          cod_commessa: e.cod_commessa ?? "",
          commessa: e.commessa ?? "",
          minutes: e.minutes ?? 0,
        })),
      };
    });

    days.push({ date: dateStr, dipendenti: dipGroups });
  }

  return (
    <div>
      <h1 className="gf-h1 mb-6">Registro Attività</h1>
      <RegistroClient
        days={days}
        fromDate={fromDate}
        attivita={(attivitaData ?? []).map(({ codattivita, descrizione }) => ({ codattivita, descrizione })) as AttivitaOption[]}
        commesse={(commesseData ?? []) as CommessaOption[]}
      />
    </div>
  );
}
