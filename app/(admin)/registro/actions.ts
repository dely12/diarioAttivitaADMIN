"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

// ── Create day (if needed) + first entry ─────────────────────────────────────
export async function createDayAndEntry(
  user_id: string,
  date: string,
  codattivita: string,
  codcommessa: string,
  minutes: number
): Promise<ActionResult> {
  const supabase = await createClient();

  // Day might already exist (e.g. from time-off materialisation)
  const { data: existing } = await supabase
    .from("days")
    .select("id")
    .eq("user_id", user_id)
    .eq("date", date)
    .maybeSingle();

  let day_id: string;

  if (existing) {
    day_id = existing.id;
  } else {
    const { data: newDay, error: dayErr } = await supabase
      .from("days")
      .insert({ user_id, date, status: "LOCKED", created_by: "ADMIN" })
      .select("id")
      .single();
    if (dayErr) return { ok: false, error: dayErr.message };
    day_id = newDay.id;
  }

  const { error: entryErr } = await supabase
    .from("entries")
    .insert({ day_id, user_id, codattivita, codcommessa, minutes, origin: "ADMIN" });

  if (entryErr) {
    // Rollback only the day we just created
    if (!existing) await supabase.from("days").delete().eq("id", day_id);
    return { ok: false, error: entryErr.message };
  }

  // If day existed and was OPEN, lock it now
  if (existing) {
    await supabase.from("days").update({ status: "LOCKED" }).eq("id", day_id);
  }

  revalidatePath("/registro");
  return { ok: true, message: "Attività aggiunta." };
}

// ── Add entry to existing day ─────────────────────────────────────────────────
export async function addEntry(
  day_id: string,
  user_id: string,
  codattivita: string,
  codcommessa: string,
  minutes: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("entries")
    .insert({ day_id, user_id, codattivita, codcommessa, minutes, origin: "ADMIN" });

  if (error) return { ok: false, error: error.message };

  // Admin inserts always lock the day
  await supabase.from("days").update({ status: "LOCKED" }).eq("id", day_id);

  revalidatePath("/registro");
  return { ok: true, message: "Attività aggiunta." };
}

// ── Lock a day manually ───────────────────────────────────────────────────────
export async function lockDay(day_id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("days")
    .update({ status: "LOCKED" })
    .eq("id", day_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/registro");
  return { ok: true, message: "Giornata bloccata." };
}

// ── Update entry ──────────────────────────────────────────────────────────────
export async function updateEntry(
  entry_id: string,
  codattivita: string,
  codcommessa: string,
  minutes: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("entries")
    .update({ codattivita, codcommessa, minutes })
    .eq("id", entry_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/registro");
  return { ok: true, message: "Attività aggiornata." };
}

// ── Delete entry (+ day if last) ─────────────────────────────────────────────
export async function deleteEntry(
  entry_id: string,
  day_id: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entry_id);

  if (error) return { ok: false, error: error.message };

  // Remove the day if no entries remain
  const { count } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("day_id", day_id);

  if ((count ?? 0) === 0) {
    await supabase.from("days").delete().eq("id", day_id);
  }

  revalidatePath("/registro");
  return { ok: true, message: "Attività eliminata." };
}
