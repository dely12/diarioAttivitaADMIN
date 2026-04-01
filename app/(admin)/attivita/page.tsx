import { createClient } from "@/lib/supabase/server";
import { AttivitaClient, type Attivita, type CommessaOption } from "./AttivitaClient";

export const dynamic = "force-dynamic";

export default async function AttivitaPage() {
  const supabase = await createClient();

  const [{ data: attivitaData, error }, { data: commesseData }] = await Promise.all([
    supabase
      .from("attivita")
      .select("codattivita, descrizione, attiva, codcommessacorrispondente, tipoassenza")
      .order("codattivita", { ascending: true }),
    supabase
      .from("commesse")
      .select("codcommessa, descrizione")
      .eq("attiva", true)
      .order("codcommessa", { ascending: true }),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="gf-h1 mb-2">Attività</h1>
        <div className="gf-error">Errore caricamento dati: {error.message}</div>
      </div>
    );
  }

  const items: Attivita[] = (attivitaData ?? [])
    .map((r) => ({
      codattivita: r.codattivita,
      descrizione: r.descrizione,
      attiva: r.attiva,
      codcommessacorrispondente: r.codcommessacorrispondente,
      tipoassenza: r.tipoassenza,
    }))
    .sort((a, b) => {
      const na = parseInt(a.codattivita, 10);
      const nb = parseInt(b.codattivita, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.codattivita.localeCompare(b.codattivita);
    });

  const commesse: CommessaOption[] = (commesseData ?? []).map((r) => ({
    codcommessa: r.codcommessa,
    descrizione: r.descrizione,
  }));

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="gf-h1">Attività</h1>
        <span className="gf-muted">{items.length} totali</span>
      </div>
      <AttivitaClient items={items} commesse={commesse} />
    </div>
  );
}
