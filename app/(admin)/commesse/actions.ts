"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type CommessaInput = {
  codcommessa: string;
  descrizione: string;
  attiva: boolean;
  qta: number | null;
  modello: string | null;
  capacita: number | null;
  ore_serbatoi: number | null;
  ore_accessori: number | null;
  ore_coibentazione: number | null;
};

export async function createCommessa(input: CommessaInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("commesse").insert({
    codcommessa:       input.codcommessa.trim().toUpperCase(),
    descrizione:       input.descrizione.trim(),
    attiva:            input.attiva,
    qta:               input.qta,
    modello:           input.modello?.trim() || null,
    capacita:          input.capacita,
    ore_serbatoi:      input.ore_serbatoi,
    ore_accessori:     input.ore_accessori,
    ore_coibentazione: input.ore_coibentazione,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commesse");
  return { ok: true, message: "Commessa creata." };
}

export async function updateCommessa(input: CommessaInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commesse")
    .update({
      descrizione:       input.descrizione.trim(),
      attiva:            input.attiva,
      qta:               input.qta,
      modello:           input.modello?.trim() || null,
      capacita:          input.capacita,
      ore_serbatoi:      input.ore_serbatoi,
      ore_accessori:     input.ore_accessori,
      ore_coibentazione: input.ore_coibentazione,
    })
    .eq("codcommessa", input.codcommessa);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commesse");
  return { ok: true, message: "Commessa aggiornata." };
}

export async function getNextCodcommessa(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `C${year}_`;

  const { data } = await supabase
    .from("commesse")
    .select("codcommessa")
    .like("codcommessa", `${prefix}%`)
    .order("codcommessa", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.codcommessa) {
    const parts = data.codcommessa.split("_");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) return `${prefix}${String(n + 1).padStart(4, "0")}`;
  }

  return `${prefix}0001`;
}

export async function deleteCommessa(codcommessa: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commesse")
    .delete()
    .eq("codcommessa", codcommessa);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commesse");
  return { ok: true, message: "Commessa eliminata." };
}
