"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createAttivita(
  codattivita: string,
  descrizione: string,
  attiva: boolean,
  codcommessacorrispondente: string | null,
  tipoassenza: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("attivita").insert({
    codattivita: codattivita.trim().toUpperCase(),
    descrizione: descrizione.trim(),
    attiva,
    codcommessacorrispondente: codcommessacorrispondente || null,
    tipoassenza,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attivita");
  return { ok: true, message: "Attività creata." };
}

export async function updateAttivita(
  codattivita: string,
  descrizione: string,
  attiva: boolean,
  codcommessacorrispondente: string | null,
  tipoassenza: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attivita")
    .update({
      descrizione: descrizione.trim(),
      attiva,
      codcommessacorrispondente: codcommessacorrispondente || null,
      tipoassenza,
    })
    .eq("codattivita", codattivita);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attivita");
  return { ok: true, message: "Attività aggiornata." };
}

export async function deleteAttivita(codattivita: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attivita")
    .delete()
    .eq("codattivita", codattivita);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attivita");
  return { ok: true, message: "Attività eliminata." };
}
