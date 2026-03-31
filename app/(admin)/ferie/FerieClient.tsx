"use client";

import { useState, useTransition } from "react";
import { approveTimeOffGroup, rejectTimeOffGroup } from "./actions";
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

// ============================================================
// Tipi
// ============================================================
type Request = {
  id: string;
  request_date: string;
  codattivita: string;
  attivita_descrizione: string;
  minutes: number;
  note_user: string | null;
  status: string;
};

export type Group = {
  request_group_id: string;
  user_id: string;
  dipendente: string;
  email: string;
  status: string; // status del gruppo (tutti uguale)
  created_at: string;
  decided_at: string | null;
  note_admin: string | null;
  requests: Request[];
};

// ============================================================
// Badge status
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "badge badge-pending",
    APPROVED: "badge badge-approved",
    REJECTED: "badge badge-rejected",
    CANCELLED: "badge badge-cancelled",
  };
  const labels: Record<string, string> = {
    PENDING: "In attesa",
    APPROVED: "Approvata",
    REJECTED: "Rifiutata",
    CANCELLED: "Annullata",
  };
  return (
    <span className={map[status] ?? "badge badge-cancelled"}>
      {labels[status] ?? status}
    </span>
  );
}

function formatIT(dateIso: string) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// ============================================================
// Dialog conferma azione
// ============================================================
function ActionDialog({
  group,
  action,
  onClose,
  onDone,
}: {
  group: Group;
  action: "APPROVE" | "REJECT";
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isApprove = action === "APPROVE";

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = isApprove
        ? await approveTimeOffGroup(group.request_group_id, note)
        : await rejectTimeOffGroup(group.request_group_id, note);

      if (result.ok) {
        onDone(result.message);
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="gf-card w-full max-w-md shadow-xl">
        <h2 className="gf-h2 mb-1">
          {isApprove ? "Approva richiesta" : "Rifiuta richiesta"}
        </h2>
        <p className="gf-help mb-4">
          Dipendente: <strong>{group.dipendente}</strong> &mdash;{" "}
          {group.requests.length} giorn{group.requests.length === 1 ? "o" : "i"}
        </p>

        {error && <div className="gf-error mb-4">{error}</div>}

        <div className="flex flex-col gap-1 mb-5">
          <label htmlFor="note-admin">
            Nota per il dipendente{" "}
            <span className="text-slate-400 font-normal">(opzionale)</span>
          </label>
          <textarea
            id="note-admin"
            rows={3}
            className="h-auto py-2 resize-none"
            placeholder={
              isApprove
                ? "Es. Approvata, buone vacanze!"
                : "Es. Periodo non disponibile, contattaci per concordare le date."
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={pending}
            className="gf-btn h-9 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className={`gf-btn h-9 px-4 text-white text-sm ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {pending
              ? "Salvataggio…"
              : isApprove
              ? "Conferma approvazione"
              : "Conferma rifiuto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Riga gruppo espandibile
// ============================================================
function GroupRow({ group, onAction }: { group: Group; onAction: (g: Group, a: "APPROVE" | "REJECT") => void }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = group.status === "PENDING";

  const dateFrom = group.requests[0]?.request_date ?? "";
  const dateTo = group.requests[group.requests.length - 1]?.request_date ?? "";
  const periodLabel =
    dateFrom === dateTo
      ? formatIT(dateFrom)
      : `${formatIT(dateFrom)} – ${formatIT(dateTo)}`;

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td>
          <div className="font-medium text-slate-900">{group.dipendente}</div>
          <div className="text-xs text-slate-500">{group.email}</div>
        </td>
        <td>{periodLabel}</td>
        <td>{group.requests.length}</td>
        <td>
          <StatusBadge status={group.status} />
        </td>
        <td className="text-slate-500 text-xs">
          {formatIT(group.created_at.slice(0, 10))}
        </td>
        <td>
          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            {isPending && (
              <>
                <button
                  onClick={() => onAction(group, "APPROVE")}
                  className="gf-btn h-8 px-3 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  title="Approva"
                >
                  <CheckCircle size={14} />
                  Approva
                </button>
                <button
                  onClick={() => onAction(group, "REJECT")}
                  className="gf-btn h-8 px-3 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                  title="Rifiuta"
                >
                  <XCircle size={14} />
                  Rifiuta
                </button>
              </>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Dettaglio giornate */}
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-slate-50 border-t border-b border-slate-100 px-4 py-3">
              {group.requests[0]?.note_user && (
                <div className="mb-3 text-sm text-slate-700">
                  <span className="font-medium">Nota dipendente:</span>{" "}
                  {group.requests[0].note_user}
                </div>
              )}
              {group.note_admin && (
                <div className="mb-3 text-sm text-slate-700">
                  <span className="font-medium">Nota admin:</span>{" "}
                  {group.note_admin}
                </div>
              )}
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Attività</th>
                    <th className="text-right">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  {group.requests.map((r) => (
                    <tr key={r.id}>
                      <td>{formatIT(r.request_date)}</td>
                      <td>
                        {r.codattivita}
                        {r.attivita_descrizione ? ` – ${r.attivita_descrizione}` : ""}
                      </td>
                      <td className="text-right">{formatMinutes(r.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================
// Filtri
// ============================================================
type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

// ============================================================
// Componente principale
// ============================================================
export function FerieClient({ groups }: { groups: Group[] }) {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [dialog, setDialog] = useState<{ group: Group; action: "APPROVE" | "REJECT" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Tutte" },
    { value: "PENDING", label: "In attesa" },
    { value: "APPROVED", label: "Approvate" },
    { value: "REJECTED", label: "Rifiutate" },
  ];

  const filtered =
    filter === "ALL" ? groups : groups.filter((g) => g.status === filter);

  const pendingCount = groups.filter((g) => g.status === "PENDING").length;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 gf-card bg-emerald-50 border-emerald-200 text-emerald-800 text-sm shadow-lg px-4 py-3">
          {toast}
        </div>
      )}

      {/* Dialog */}
      {dialog && (
        <ActionDialog
          group={dialog.group}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={showToast}
        />
      )}

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`gf-btn h-8 px-3 text-sm border ${
              filter === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
            {value === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabella desktop */}
      <div className="gf-card p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center gf-muted">Nessuna richiesta.</div>
        ) : (
          <>
            {/* Tabella — visibile ≥md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Dipendente</th>
                    <th>Periodo</th>
                    <th>Giorni</th>
                    <th>Stato</th>
                    <th>Richiesta il</th>
                    <th className="text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <GroupRow
                      key={g.request_group_id}
                      group={g}
                      onAction={(group, action) => setDialog({ group, action })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list — visibile <md */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((g) => {
                const dateFrom = g.requests[0]?.request_date ?? "";
                const dateTo = g.requests[g.requests.length - 1]?.request_date ?? "";
                const periodLabel =
                  dateFrom === dateTo
                    ? formatIT(dateFrom)
                    : `${formatIT(dateFrom)} – ${formatIT(dateTo)}`;

                return (
                  <div key={g.request_group_id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{g.dipendente}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{periodLabel} · {g.requests.length} gg</div>
                      </div>
                      <StatusBadge status={g.status} />
                    </div>
                    {g.status === "PENDING" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setDialog({ group: g, action: "APPROVE" })}
                          className="gf-btn flex-1 h-9 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        >
                          <CheckCircle size={14} /> Approva
                        </button>
                        <button
                          onClick={() => setDialog({ group: g, action: "REJECT" })}
                          className="gf-btn flex-1 h-9 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        >
                          <XCircle size={14} /> Rifiuta
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
