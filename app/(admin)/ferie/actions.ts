"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// Tipi
// ============================================================
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

// ============================================================
// Helpers mail (Resend diretto, senza queue)
// ============================================================
function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatIT(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function buildApprovalHtml(args: {
  displayName: string;
  noteAdmin: string | null;
  rows: Array<{
    request_date: string;
    codattivita: string;
    attivita_descrizione: string;
    minutes: number;
  }>;
}): string {
  const from = args.rows[0]?.request_date ?? "";
  const to = args.rows[args.rows.length - 1]?.request_date ?? "";

  const rowsHtml = args.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(formatIT(r.request_date))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(r.codattivita)} - ${esc(r.attivita_descrizione)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(formatMinutes(r.minutes))}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 12px">Richiesta ferie/permesso approvata</h2>

    <p style="margin:0 0 8px">Ciao <strong>${esc(args.displayName)}</strong>,</p>
    <p style="margin:0 0 16px">la tua richiesta per il periodo
      <strong>${esc(formatIT(from))}${from !== to ? ` - ${esc(formatIT(to))}` : ""}</strong>
      è stata <strong style="color:#166534">approvata</strong>.
    </p>

    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Data</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Tipo assenza</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1">Durata</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${
      args.noteAdmin
        ? `<div style="margin-top:16px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
             <div style="font-weight:600;margin-bottom:6px">Nota dell'amministratore</div>
             <div>${esc(args.noteAdmin)}</div>
           </div>`
        : ""
    }

    <p style="margin-top:20px;color:#475569;font-size:0.875rem">
      Il tuo calendario è stato aggiornato automaticamente.
    </p>
  </div>`;
}

function buildCancellationHtml(args: {
  displayName: string;
  noteAdmin: string | null;
  rows: Array<{
    request_date: string;
    codattivita: string;
    attivita_descrizione: string;
    minutes: number;
  }>;
}): string {
  const from = args.rows[0]?.request_date ?? "";
  const to = args.rows[args.rows.length - 1]?.request_date ?? "";

  const rowsHtml = args.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(formatIT(r.request_date))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(r.codattivita)} - ${esc(r.attivita_descrizione)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(formatMinutes(r.minutes))}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 12px">Richiesta ferie/permesso annullata</h2>

    <p style="margin:0 0 8px">Ciao <strong>${esc(args.displayName)}</strong>,</p>
    <p style="margin:0 0 16px">la tua richiesta precedentemente approvata per il periodo
      <strong>${esc(formatIT(from))}${from !== to ? ` - ${esc(formatIT(to))}` : ""}</strong>
      è stata <strong style="color:#92400e">annullata</strong> dall'amministratore.
      Puoi richiedere nuovamente le ferie per questo periodo.
    </p>

    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Data</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Tipo assenza</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1">Durata</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${
      args.noteAdmin
        ? `<div style="margin-top:16px;padding:12px;border:1px solid #fed7aa;border-radius:8px;background:#fff7ed">
             <div style="font-weight:600;margin-bottom:6px;color:#92400e">Nota dell'amministratore</div>
             <div>${esc(args.noteAdmin)}</div>
           </div>`
        : ""
    }

    <p style="margin-top:20px;color:#475569;font-size:0.875rem">
      Per ulteriori informazioni contatta il tuo responsabile.
    </p>
  </div>`;
}

function buildRejectionHtml(args: {
  displayName: string;
  noteAdmin: string | null;
  rows: Array<{
    request_date: string;
    codattivita: string;
    attivita_descrizione: string;
    minutes: number;
  }>;
}): string {
  const from = args.rows[0]?.request_date ?? "";
  const to = args.rows[args.rows.length - 1]?.request_date ?? "";

  const rowsHtml = args.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(formatIT(r.request_date))}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(r.codattivita)} - ${esc(r.attivita_descrizione)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(formatMinutes(r.minutes))}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 12px">Richiesta ferie/permesso non approvata</h2>

    <p style="margin:0 0 8px">Ciao <strong>${esc(args.displayName)}</strong>,</p>
    <p style="margin:0 0 16px">la tua richiesta per il periodo
      <strong>${esc(formatIT(from))}${from !== to ? ` - ${esc(formatIT(to))}` : ""}</strong>
      non è stata approvata.
    </p>

    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Data</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1">Tipo assenza</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1">Durata</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${
      args.noteAdmin
        ? `<div style="margin-top:16px;padding:12px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2">
             <div style="font-weight:600;margin-bottom:6px;color:#991b1b">Motivazione</div>
             <div>${esc(args.noteAdmin)}</div>
           </div>`
        : ""
    }

    <p style="margin-top:20px;color:#475569;font-size:0.875rem">
      Per ulteriori informazioni contatta il tuo responsabile.
    </p>
  </div>`;
}

async function sendMailDirect(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.RESEND_FROM?.trim() ?? "";

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY o RESEND_FROM mancanti" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { ok: false, error: `Resend ${resp.status}: ${body.slice(0, 300)}` };
    }

    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ============================================================
// Action: APPROVA gruppo ferie
// ============================================================
export async function approveTimeOffGroup(
  requestGroupId: string,
  noteAdmin: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  // Chiama la DB function SECURITY DEFINER che gestisce tutta la materializzazione
  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    "process_time_off_request_group",
    {
      p_request_group_id: requestGroupId,
      p_action: "APPROVE",
      p_admin_user_id: user.id,
      p_note_admin: noteAdmin.trim() || undefined,
    }
  );

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  const result = rpcResult as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Errore sconosciuto dalla DB function" };
  }

  // Recupera dati per la mail
  await sendApprovalMail(supabase, requestGroupId, noteAdmin, "APPROVED");

  revalidatePath("/ferie");
  return { ok: true, message: "Richiesta approvata con successo." };
}

// ============================================================
// Action: RIFIUTA gruppo ferie
// ============================================================
export async function rejectTimeOffGroup(
  requestGroupId: string,
  noteAdmin: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    "process_time_off_request_group",
    {
      p_request_group_id: requestGroupId,
      p_action: "REJECT",
      p_admin_user_id: user.id,
      p_note_admin: noteAdmin.trim() || undefined,
    }
  );

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  const result = rpcResult as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Errore sconosciuto dalla DB function" };
  }

  await sendApprovalMail(supabase, requestGroupId, noteAdmin, "REJECTED");

  revalidatePath("/ferie");
  return { ok: true, message: "Richiesta rifiutata." };
}

// ============================================================
// Action: ANNULLA gruppo ferie già approvato
// ============================================================
export async function cancelTimeOffGroup(
  requestGroupId: string,
  noteAdmin: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    "cancel_time_off_request_group",
    {
      p_request_group_id: requestGroupId,
      p_admin_user_id: user.id,
      p_note_admin: noteAdmin.trim() || undefined,
    }
  );

  if (rpcErr) return { ok: false, error: rpcErr.message };

  const result = rpcResult as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Errore sconosciuto dalla DB function" };
  }

  await sendApprovalMail(supabase, requestGroupId, noteAdmin, "CANCELLED");

  revalidatePath("/ferie");
  return { ok: true, message: "Richiesta annullata. Il dipendente può effettuare una nuova richiesta." };
}

// ============================================================
// Invio mail dopo decisione
// ============================================================
async function sendApprovalMail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  requestGroupId: string,
  noteAdmin: string,
  decision: "APPROVED" | "REJECTED" | "CANCELLED"
) {
  try {
    // Leggi le righe del gruppo (ora già aggiornate)
    const { data: rows } = await supabase
      .from("time_off_requests")
      .select(
        "request_date, codattivita, minutes, user_id, time_off_requests_user_id_fkey(email)"
      )
      .eq("request_group_id", requestGroupId)
      .order("request_date", { ascending: true });

    if (!rows?.length) return;

    const userId = rows[0].user_id as string;
    const userEmail = (rows[0] as { time_off_requests_user_id_fkey?: { email?: string } })
      .time_off_requests_user_id_fkey?.email ?? "";

    if (!userEmail) return;

    // Nome dipendente
    const { data: dep } = await supabase
      .from("dipendenti")
      .select("nomedipendente")
      .eq("user_id", userId)
      .maybeSingle();

    const displayName = dep?.nomedipendente ?? userEmail;

    // Descrizioni attività
    const attCodes = [...new Set(rows.map((r: { codattivita: string }) => r.codattivita as string))];
    const { data: attRows } = await supabase
      .from("attivita")
      .select("codattivita, descrizione")
      .in("codattivita", attCodes);

    const attMap = new Map<string, string>(
      (attRows ?? []).map((a: { codattivita: string; descrizione: string }) => [a.codattivita, a.descrizione])
    );

    const mailRows = rows.map((r: { request_date: string; codattivita: string; minutes: number }) => ({
      request_date: r.request_date as string,
      codattivita: r.codattivita as string,
      attivita_descrizione: attMap.get(r.codattivita as string) ?? "",
      minutes: r.minutes as number,
    }));

    const subject =
      decision === "APPROVED"
        ? "Richiesta ferie approvata"
        : decision === "REJECTED"
        ? "Richiesta ferie non approvata"
        : "Richiesta ferie annullata";

    const html =
      decision === "APPROVED"
        ? buildApprovalHtml({ displayName, noteAdmin: noteAdmin || null, rows: mailRows })
        : decision === "REJECTED"
        ? buildRejectionHtml({ displayName, noteAdmin: noteAdmin || null, rows: mailRows })
        : buildCancellationHtml({ displayName, noteAdmin: noteAdmin || null, rows: mailRows });

    // Best-effort: non blocca la risposta all'utente admin in caso di errore
    const mailResult = await sendMailDirect({ to: userEmail, subject, html });
    if (!mailResult.ok) {
      console.error("Mail send failed:", mailResult.error);
    }
  } catch (e) {
    console.error("sendApprovalMail error:", e);
  }
}
