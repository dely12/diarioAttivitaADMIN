"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/useToast";
import { approveTimeOffGroup, rejectTimeOffGroup, cancelTimeOffGroup } from "./actions";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Ban, ChevronLeft, ChevronRight } from "lucide-react";

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
  status: string;
  created_at: string;
  decided_at: string | null;
  note_admin: string | null;
  requests: Request[];
};

type DialogAction = "APPROVE" | "REJECT" | "CANCEL";

// ============================================================
// Helpers
// ============================================================
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
// Badge status
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:   "badge badge-pending",
    APPROVED:  "badge badge-approved",
    REJECTED:  "badge badge-rejected",
    CANCELLED: "badge badge-cancelled",
  };
  const labels: Record<string, string> = {
    PENDING:   "In attesa",
    APPROVED:  "Approvata",
    REJECTED:  "Rifiutata",
    CANCELLED: "Annullata",
  };
  return (
    <span className={map[status] ?? "badge badge-cancelled"}>
      {labels[status] ?? status}
    </span>
  );
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
  action: DialogAction;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cfg = {
    APPROVE: {
      title: "Approva richiesta",
      btnClass: "bg-emerald-600 hover:bg-emerald-700",
      btnLabel: "Conferma approvazione",
      placeholder: "Es. Approvata, buone vacanze!",
    },
    REJECT: {
      title: "Rifiuta richiesta",
      btnClass: "bg-red-600 hover:bg-red-700",
      btnLabel: "Conferma rifiuto",
      placeholder: "Es. Periodo non disponibile, contattaci per concordare le date.",
    },
    CANCEL: {
      title: "Annulla richiesta approvata",
      btnClass: "bg-amber-600 hover:bg-amber-700",
      btnLabel: "Conferma annullamento",
      placeholder: "Es. Modifica organizzativa dell'ultimo momento.",
    },
  }[action];

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result =
        action === "APPROVE"
          ? await approveTimeOffGroup(group.request_group_id, note)
          : action === "REJECT"
          ? await rejectTimeOffGroup(group.request_group_id, note)
          : await cancelTimeOffGroup(group.request_group_id, note);

      if (result.ok) { onDone(result.message); onClose(); }
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="gf-card w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto">
        <h2 className="gf-h2 mb-1">{cfg.title}</h2>
        <p className="gf-help mb-4">
          Dipendente: <strong>{group.dipendente}</strong> &mdash;{" "}
          {group.requests.length} giorn{group.requests.length === 1 ? "o" : "i"}
        </p>

        {action === "CANCEL" && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Il dipendente riceverà una notifica e potrà richiedere nuovamente le ferie per questo periodo.
          </div>
        )}

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
            placeholder={cfg.placeholder}
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
            className={`gf-btn h-9 px-4 text-white text-sm ${cfg.btnClass}`}
          >
            {pending ? "Salvataggio…" : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Riga gruppo espandibile (desktop)
// ============================================================
function GroupRow({
  group,
  onAction,
}: {
  group: Group;
  onAction: (g: Group, a: DialogAction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending  = group.status === "PENDING";
  const isApproved = group.status === "APPROVED";

  const dateFrom = group.requests[0]?.request_date ?? "";
  const dateTo   = group.requests[group.requests.length - 1]?.request_date ?? "";
  const periodLabel =
    dateFrom === dateTo ? formatIT(dateFrom) : `${formatIT(dateFrom)} – ${formatIT(dateTo)}`;

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td>
          <div className="font-medium text-slate-900">{group.dipendente}</div>
          <div className="text-xs text-slate-500">{group.email}</div>
        </td>
        <td>{periodLabel}</td>
        <td>{group.requests.length}</td>
        <td><StatusBadge status={group.status} /></td>
        <td className="text-slate-500 text-xs">{formatIT(group.created_at.slice(0, 10))}</td>
        <td>
          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            {isPending && (
              <>
                <button
                  onClick={() => onAction(group, "APPROVE")}
                  className="gf-btn h-8 px-3 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  <CheckCircle size={14} /> Approva
                </button>
                <button
                  onClick={() => onAction(group, "REJECT")}
                  className="gf-btn h-8 px-3 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                >
                  <XCircle size={14} /> Rifiuta
                </button>
              </>
            )}
            {isApproved && (
              <button
                onClick={() => onAction(group, "CANCEL")}
                className="gf-btn h-8 px-3 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              >
                <Ban size={14} /> Annulla
              </button>
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
                  <span className="font-medium">Nota admin:</span> {group.note_admin}
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
// Card mobile per singolo gruppo
// ============================================================
function MobileGroupCard({
  group,
  onAction,
}: {
  group: Group;
  onAction: (g: Group, a: DialogAction) => void;
}) {
  const isPending  = group.status === "PENDING";
  const isApproved = group.status === "APPROVED";

  const dateFrom = group.requests[0]?.request_date ?? "";
  const dateTo   = group.requests[group.requests.length - 1]?.request_date ?? "";
  const periodLabel =
    dateFrom === dateTo ? formatIT(dateFrom) : `${formatIT(dateFrom)} – ${formatIT(dateTo)}`;

  return (
    <div className="gf-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium text-slate-900 text-sm">{group.dipendente}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {periodLabel} · {group.requests.length} gg
          </div>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {(isPending || isApproved) && (
        <div className="flex gap-2 mt-3">
          {isPending && (
            <>
              <button
                onClick={() => onAction(group, "APPROVE")}
                className="gf-btn flex-1 h-9 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              >
                <CheckCircle size={14} /> Approva
              </button>
              <button
                onClick={() => onAction(group, "REJECT")}
                className="gf-btn flex-1 h-9 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              >
                <XCircle size={14} /> Rifiuta
              </button>
            </>
          )}
          {isApproved && (
            <button
              onClick={() => onAction(group, "CANCEL")}
              className="gf-btn flex-1 h-9 text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            >
              <Ban size={14} /> Annulla approvazione
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Componente principale
// ============================================================
type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthTitle(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const label = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function FerieClient({
  groups,
  currentMonth,
}: {
  groups: Group[];
  currentMonth: string;
}) {
  const router = useRouter();
  const [filterStatus, setFilterStatus]     = useState<StatusFilter>("PENDING");
  const [filterDip, setFilterDip]           = useState<string>("ALL");
  const [dialog, setDialog] = useState<{ group: Group; action: DialogAction } | null>(null);
  const { toast, showToast } = useToast();

  function goToMonth(ym: string) {
    router.push(`/ferie?m=${ym}`);
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = currentMonth === thisMonth;

  // Dipendenti unici per il filtro
  const dipendenti = useMemo(
    () => [...new Set(groups.map((g) => g.dipendente))].sort(),
    [groups]
  );

  // Filtra
  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchStatus = filterStatus === "ALL" || g.status === filterStatus;
      const matchDip    = filterDip === "ALL" || g.dipendente === filterDip;
      return matchStatus && matchDip;
    });
  }, [groups, filterStatus, filterDip]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ka = a.requests[0]?.request_date ?? a.created_at;
      const kb = b.requests[0]?.request_date ?? b.created_at;
      return kb.localeCompare(ka);
    });
  }, [filtered]);

  const pendingCount = groups.filter((g) => g.status === "PENDING").length;

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "ALL",       label: "Tutte" },
    { value: "PENDING",   label: "In attesa" },
    { value: "APPROVED",  label: "Approvate" },
    { value: "REJECTED",  label: "Rifiutate" },
    { value: "CANCELLED", label: "Annullate" },
  ];

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

      {/* ── Navigazione mese ────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => goToMonth(prevMonth(currentMonth))}
          className="gf-btn h-9 w-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Mese precedente"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="gf-h2 min-w-40 text-center">{monthTitle(currentMonth)}</span>
        <button
          onClick={() => goToMonth(nextMonth(currentMonth))}
          disabled={isCurrentMonth}
          className="gf-btn h-9 w-9 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Mese successivo"
        >
          <ChevronRight size={18} />
        </button>
        {!isCurrentMonth && (
          <button
            onClick={() => goToMonth(thisMonth)}
            className="gf-btn h-8 px-3 text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 ml-1"
          >
            Oggi
          </button>
        )}
      </div>

      {/* ── Filtri ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`gf-btn h-8 px-3 text-sm border ${
                filterStatus === value
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

        {/* Dipendente select */}
        {dipendenti.length > 1 && (
          <select
            value={filterDip}
            onChange={(e) => setFilterDip(e.target.value)}
            className="h-8 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 min-w-40"
            style={{ height: "2rem" }}
          >
            <option value="ALL">Tutti i dipendenti</option>
            {dipendenti.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Nessun risultato ────────────────────────────────── */}
      {sorted.length === 0 && (
        <div className="gf-card py-12 text-center gf-muted">Nessuna richiesta.</div>
      )}

      {/* ── Desktop: tabella ────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="gf-card p-0 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
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
                {sorted.map((g) => (
                  <GroupRow
                    key={g.request_group_id}
                    group={g}
                    onAction={(group, action) => setDialog({ group, action })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mobile: card list ───────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {sorted.map((g) => (
            <MobileGroupCard
              key={g.request_group_id}
              group={g}
              onAction={(group, action) => setDialog({ group, action })}
            />
          ))}
        </div>
      )}
    </>
  );
}
