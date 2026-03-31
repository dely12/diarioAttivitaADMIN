import { createClient } from "@/lib/supabase/server";
import { FerieClient, type Group } from "./FerieClient";

export const dynamic = "force-dynamic";

export default async function FeriePage() {
  const supabase = await createClient();

  // Legge tutte le richieste con join dipendente
  // RLS policy "admin_select_time_off_requests" permette la lettura di tutti i record
  const { data: rows, error } = await supabase
    .from("time_off_requests")
    .select(
      `id, request_group_id, user_id, request_date, codattivita,
       minutes, note_user, note_admin, status, created_at, decided_at,
       dipendenti!time_off_requests_user_id_fkey(nomedipendente, email)`
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="gf-h1 mb-2">Richieste Ferie</h1>
        <div className="gf-error">Errore caricamento dati: {error.message}</div>
      </div>
    );
  }

  // Carica le descrizioni attività separatamente (non c'è FK verso attivita)
  const codici = [...new Set((rows ?? []).map((r) => r.codattivita).filter(Boolean))];
  const attivitaMap = new Map<string, string>();
  if (codici.length > 0) {
    const { data: attivitaRows } = await supabase
      .from("attivita")
      .select("codattivita, descrizione")
      .in("codattivita", codici as string[]);
    for (const a of attivitaRows ?? []) {
      attivitaMap.set(a.codattivita, a.descrizione ?? "");
    }
  }

  // Raggruppa per request_group_id
  const groupMap = new Map<string, Group>();

  for (const row of rows ?? []) {
    const gid = row.request_group_id as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dep = row.dipendenti as any;

    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        request_group_id: gid,
        user_id: row.user_id as string,
        dipendente: dep?.nomedipendente ?? "",
        email: dep?.email ?? "",
        status: row.status as string,
        created_at: row.created_at as string,
        decided_at: row.decided_at as string | null,
        note_admin: row.note_admin as string | null,
        requests: [],
      });
    }

    groupMap.get(gid)!.requests.push({
      id: row.id as string,
      request_date: row.request_date as string,
      codattivita: row.codattivita as string,
      attivita_descrizione: attivitaMap.get(row.codattivita as string) ?? "",
      minutes: row.minutes as number,
      note_user: row.note_user as string | null,
      status: row.status as string,
    });
  }

  // Ordina le richieste dentro ogni gruppo per data
  const groups: Group[] = [...groupMap.values()].map((g) => ({
    ...g,
    requests: g.requests.sort((a, b) => a.request_date.localeCompare(b.request_date)),
  }));

  const pendingCount = groups.filter((g) => g.status === "PENDING").length;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="gf-h1">Richieste Ferie</h1>
        {pendingCount > 0 && (
          <span className="badge badge-pending">
            {pendingCount} in attesa
          </span>
        )}
      </div>

      <FerieClient groups={groups} />
    </div>
  );
}
