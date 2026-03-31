"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createCommessa(
  codcommessa: string,
  descrizione: string,
  attiva: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commesse")
    .insert({ codcommessa: codcommessa.trim().toUpperCase(), descrizione: descrizione.trim(), attiva });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commesse");
  return { ok: true, message: "Commessa creata." };
}

export async function updateCommessa(
  codcommessa: string,
  descrizione: string,
  attiva: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commesse")
    .update({ descrizione: descrizione.trim(), attiva })
    .eq("codcommessa", codcommessa);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commesse");
  return { ok: true, message: "Commessa aggiornata." };
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
