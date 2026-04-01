import { createClient } from "@/lib/supabase/server";
import { CommesseClient, type Commessa } from "./CommesseClient";

export const dynamic = "force-dynamic";

export default async function CommessePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commesse_con_ore")
    .select("*")
    .order("codcommessa", { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="gf-h1 mb-2">Commesse</h1>
        <div className="gf-error">Errore caricamento dati: {error.message}</div>
      </div>
    );
  }

  const items: Commessa[] = (data ?? []).map((r) => ({
    codcommessa:       r.codcommessa!,
    descrizione:       r.descrizione!,
    attiva:            r.attiva,
    qta:               r.qta,
    modello:           r.modello,
    capacita:          r.capacita,
    ore_serbatoi:      r.ore_serbatoi,
    ore_accessori:     r.ore_accessori,
    ore_coibentazione: r.ore_coibentazione,
    tot_ore_vendute:   r.tot_ore_vendute,
    ore_lavorate:      r.ore_lavorate,
  }));

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="gf-h1">Commesse</h1>
        <span className="gf-muted">{items.length} totali</span>
      </div>
      <CommesseClient items={items} />
    </div>
  );
}
