"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Lock,
  Calendar,
} from "lucide-react";
import { useToast } from "@/lib/useToast";
import { addEntry, createDayAndEntry, updateEntry, deleteEntry, lockDay } from "./actions";
import type { ActionResult } from "./actions";

// ── Types ────────────────────────────────────────────────────────────────────

export type EntryRow = {
  entry_id: string;
  cod_attivita: string;
  attivita: string;
  cod_commessa: string;
  commessa: string;
  minutes: number;
};

export type DipGroup = {
  user_id: string;
  dipendente: string;
  day_id: string | null;
  day_status: string | null;
  total_minutes: number;
  activity_minutes: number;
  absence_minutes: number;
  entries: EntryRow[];
};

export type DayData = {
  date: string;
  dipendenti: DipGroup[];
};

export type AttivitaOption = { codattivita: string; descrizione: string };
export type CommessaOption = { codcommessa: string; descrizione: string };

// ── Date helpers ─────────────────────────────────────────────────────────────

const DAYS_FULL = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MONTHS_FULL = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDate(dateStr: string, n: number): string {
  const d = parseLocal(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayInfo(dateStr: string) {
  const d = parseLocal(dateStr);
  const dow = d.getDay();
  return {
    full: `${DAYS_FULL[dow]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`,
    short: `${DAYS_SHORT[dow]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
    isWeekend: dow === 0 || dow === 6,
  };
}

function weekRange(fromDate: string): string {
  const f = parseLocal(fromDate);
  const t = parseLocal(shiftDate(fromDate, 6));
  if (f.getFullYear() !== t.getFullYear()) {
    return `${f.getDate()} ${MONTHS_SHORT[f.getMonth()]} ${f.getFullYear()} – ${t.getDate()} ${MONTHS_SHORT[t.getMonth()]} ${t.getFullYear()}`;
  }
  if (f.getMonth() !== t.getMonth()) {
    return `${f.getDate()} ${MONTHS_SHORT[f.getMonth()]} – ${t.getDate()} ${MONTHS_SHORT[t.getMonth()]} ${f.getFullYear()}`;
  }
  return `${f.getDate()}–${t.getDate()} ${MONTHS_SHORT[f.getMonth()]} ${f.getFullYear()}`;
}

function fmtMin(min: number): string {
  if (min === 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function min2hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function hhmm2min(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

// ── EntryForm ────────────────────────────────────────────────────────────────

function EntryForm({
  defaultCodattivita = "",
  defaultCodcommessa = "",
  defaultMinutes = 480,
  attivita,
  commesse,
  saveLabel = "Aggiungi",
  onSave,
  onCancel,
}: {
  defaultCodattivita?: string;
  defaultCodcommessa?: string;
  defaultMinutes?: number;
  attivita: AttivitaOption[];
  commesse: CommessaOption[];
  saveLabel?: string;
  onSave: (codattivita: string, codcommessa: string, minutes: number) => Promise<ActionResult>;
  onCancel: () => void;
}) {
  const [codattivita, setCodattivita] = useState(defaultCodattivita);
  const [codcommessa, setCodcommessa] = useState(defaultCodcommessa);
  const [timeInput, setTimeInput] = useState(min2hhmm(defaultMinutes));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!codattivita) { setError("Seleziona un'attività."); return; }
    const minutes = hhmm2min(timeInput);
    if (minutes <= 0) { setError("Inserire un orario valido (es. 08:00)."); return; }
    setError(null);
    startTransition(async () => {
      const result = await onSave(codattivita, codcommessa, minutes);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 min-w-[150px] flex-1">
          <label className="text-xs text-slate-500">Attività *</label>
          <select
            value={codattivita}
            onChange={(e) => setCodattivita(e.target.value)}
            className="text-sm h-8 rounded border border-slate-300 px-2 bg-white"
          >
            <option value="">— Seleziona —</option>
            {attivita.map((a) => (
              <option key={a.codattivita} value={a.codattivita}>
                {a.codattivita} — {a.descrizione}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[150px] flex-1">
          <label className="text-xs text-slate-500">Commessa</label>
          <select
            value={codcommessa}
            onChange={(e) => setCodcommessa(e.target.value)}
            className="text-sm h-8 rounded border border-slate-300 px-2 bg-white"
          >
            <option value="">— Nessuna —</option>
            {commesse.map((c) => (
              <option key={c.codcommessa} value={c.codcommessa}>
                {c.codcommessa} — {c.descrizione}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-24 flex-shrink-0">
          <label className="text-xs text-slate-500">Durata *</label>
          <input
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="text-sm h-8 rounded border border-slate-300 px-2 bg-white"
          />
        </div>

        <div className="flex gap-1.5 flex-shrink-0 self-end pb-0.5">
          <button
            onClick={onCancel}
            disabled={pending}
            className="gf-btn h-8 w-8 bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Annulla"
          >
            <X size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className="gf-btn h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            {pending ? "…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DipGroupRow ───────────────────────────────────────────────────────────────

function DipGroupRow({
  date,
  group,
  isExpanded,
  onToggle,
  onSuccess,
  attivita,
  commesse,
}: {
  date: string;
  group: DipGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSuccess: (msg: string) => void;
  attivita: AttivitaOption[];
  commesse: CommessaOption[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [, startDelete] = useTransition();
  const [lockPending, startLock] = useTransition();

  const { total_minutes, activity_minutes, absence_minutes, day_status, entries, day_id } = group;
  const hasEntries = entries.length > 0;
  // Status badge
  const statusBadge =
    day_status === "LOCKED" ? (
      <span className="badge badge-approved text-xs">Confermato</span>
    ) : day_status === "OPEN" ? (
      <span className="badge badge-pending text-xs">In comp.</span>
    ) : null;


  function handleDelete(entry_id: string, d_id: string) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteEntry(entry_id, d_id);
      if (result.ok) onSuccess(result.message);
      else setDeleteError(result.error);
    });
  }

  function handleLock() {
    if (!day_id) return;
    setLockError(null);
    startLock(async () => {
      const result = await lockDay(day_id);
      if (result.ok) onSuccess(result.message);
      else setLockError(result.error);
    });
  }

  function handleAddSuccess(msg: string) {
    setAddOpen(false);
    onSuccess(msg);
  }

  function handleEditSuccess(msg: string) {
    setEditingId(null);
    onSuccess(msg);
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-50 select-none"
        onClick={onToggle}
      >
        <span className="text-slate-400 flex-shrink-0">
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>

        <span className="font-medium text-slate-800 text-sm flex-1 min-w-0 truncate">
          {group.dipendente}
        </span>

        {/* Time breakdown badges */}
        {!hasEntries ? (
          <span className="text-xs text-slate-400 italic flex-shrink-0">Non compilato!!</span>
        ) : (
          <span className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {activity_minutes > 0 && (
              <span className="inline-flex items-center text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                {fmtMin(activity_minutes)} attività
              </span>
            )}
            {absence_minutes > 0 && (
              <span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                {fmtMin(absence_minutes)} assenza
              </span>
            )}
            {total_minutes < 480 && (
              <span className="inline-flex items-center text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                −{fmtMin(480 - total_minutes)}
              </span>
            )}
            {total_minutes > 480 && (
              <span className="inline-flex items-center text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                +{fmtMin(total_minutes - 480)} straordinario
              </span>
            )}
          </span>
        )}

        {statusBadge && (
          <span className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {statusBadge}
          </span>
        )}

        {/* Lock button — only for OPEN days with entries */}
        {day_status === "OPEN" && hasEntries && (
          <button
            onClick={(e) => { e.stopPropagation(); handleLock(); }}
            disabled={lockPending}
            className="gf-btn h-7 px-2 text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 flex-shrink-0"
            title="Blocca giornata"
          >
            <Lock size={12} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setAddOpen(true);
            if (!isExpanded) onToggle();
          }}
          className="gf-btn h-7 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex-shrink-0 ml-1"
          title="Aggiungi attività"
        >
          <Plus size={12} />
          <span className="hidden sm:inline">Aggiungi</span>
        </button>
      </div>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {(deleteError || lockError) && (
            <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {deleteError || lockError}
            </p>
          )}

          {entries.length === 0 && !addOpen && (
            <p className="px-4 py-3 text-xs text-slate-400 italic">
              Nessuna attività registrata per questo giorno.
            </p>
          )}

          {entries.map((entry) => (
            <div key={entry.entry_id} className="border-b border-slate-100 last:border-0">
              {editingId === entry.entry_id ? (
                <div className="px-3 py-2">
                  <EntryForm
                    defaultCodattivita={entry.cod_attivita}
                    defaultCodcommessa={entry.cod_commessa}
                    defaultMinutes={entry.minutes}
                    attivita={attivita}
                    commesse={commesse}
                    saveLabel="Salva"
                    onCancel={() => setEditingId(null)}
                    onSave={async (codattivita, codcommessa, minutes) => {
                      const result = await updateEntry(entry.entry_id, codattivita, codcommessa, minutes);
                      if (result.ok) handleEditSuccess(result.message);
                      return result;
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50/60">
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 flex-shrink-0">
                      {entry.cod_attivita}
                    </span>
                    {entry.cod_commessa && (
                      <span className="font-mono text-xs text-slate-400 flex-shrink-0">
                        {entry.cod_commessa}
                      </span>
                    )}
                    <span className="text-xs text-slate-600 truncate">
                      {entry.attivita || entry.commessa || "—"}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-700 flex-shrink-0 w-14 text-right">
                    {fmtMin(entry.minutes)}
                  </span>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(entry.entry_id)}
                      className="gf-btn h-7 w-7 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                      title="Modifica"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => day_id && handleDelete(entry.entry_id, day_id)}
                      className="gf-btn h-7 w-7 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      title="Elimina"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {addOpen && (
            <div className="px-3 py-2 border-t border-slate-100">
              <EntryForm
                attivita={attivita}
                commesse={commesse}
                onCancel={() => setAddOpen(false)}
                onSave={async (codattivita, codcommessa, minutes) => {
                  const result = day_id
                    ? await addEntry(day_id, group.user_id, codattivita, codcommessa, minutes)
                    : await createDayAndEntry(group.user_id, date, codattivita, codcommessa, minutes);
                  if (result.ok) handleAddSuccess(result.message);
                  return result;
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── DaySection ────────────────────────────────────────────────────────────────

function DaySection({
  day,
  expandedGroups,
  onToggle,
  onSuccess,
  attivita,
  commesse,
}: {
  day: DayData;
  expandedGroups: Set<string>;
  onToggle: (key: string) => void;
  onSuccess: (msg: string) => void;
  attivita: AttivitaOption[];
  commesse: CommessaOption[];
}) {
  const { full, isWeekend } = dayInfo(day.date);

  return (
    <section className="mb-6">
      <div
        className={`flex items-center gap-2 mb-2.5 pb-1.5 border-b-2 ${
          isWeekend ? "border-slate-200" : "border-blue-200"
        }`}
      >
        <h2
          className={`text-sm font-semibold capitalize ${
            isWeekend ? "text-slate-400" : "text-slate-700"
          }`}
        >
          {full}
        </h2>
        {isWeekend && (
          <span className="text-xs text-slate-400">(weekend)</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {day.dipendenti.map((group) => {
          const key = `${day.date}:${group.user_id}`;
          return (
            <DipGroupRow
              key={key}
              date={day.date}
              group={group}
              isExpanded={expandedGroups.has(key)}
              onToggle={() => onToggle(key)}
              onSuccess={onSuccess}
              attivita={attivita}
              commesse={commesse}
            />
          );
        })}
      </div>
    </section>
  );
}

// ── RegistroClient ────────────────────────────────────────────────────────────

export function RegistroClient({
  days,
  fromDate,
  attivita,
  commesse,
}: {
  days: DayData[];
  fromDate: string;
  attivita: AttivitaOption[];
  commesse: CommessaOption[];
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const allKeys = days.flatMap((d) => d.dipendenti.map((g) => `${d.date}:${g.user_id}`));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function navigate(delta: number) {
    router.push(`/registro?from=${shiftDate(fromDate, delta)}`);
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const allExpanded = allKeys.length > 0 && expandedGroups.size >= allKeys.length;

  function handleSuccess(msg: string) {
    showToast(msg);
    router.refresh();
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 gf-card bg-emerald-50 border-emerald-200 text-emerald-800 text-sm shadow-lg px-4 py-3">
          {toast}
        </div>
      )}

      {/* ── Navigation bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Prev buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-7)}
            className="gf-btn h-8 px-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Settimana precedente"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="gf-btn h-8 px-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Giorno precedente"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Date label + picker */}
        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-35">
          <span className="text-sm font-semibold text-slate-700 hidden md:inline">
            {weekRange(fromDate)}
          </span>
          <span className="text-sm font-semibold text-slate-700 md:hidden">
            {dayInfo(fromDate).short}
          </span>
          <button
            onClick={() => dateInputRef.current?.showPicker()}
            className="gf-btn h-7 w-7 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
            title="Scegli data"
          >
            <Calendar size={14} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={fromDate}
            onChange={(e) => e.target.value && router.push(`/registro?from=${e.target.value}`)}
            className="sr-only"
          />
        </div>

        {/* Next buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(1)}
            className="gf-btn h-8 px-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Giorno successivo"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => navigate(7)}
            className="gf-btn h-8 px-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Settimana successiva"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Expand / collapse all */}
        <button
          onClick={() =>
            allExpanded
              ? setExpandedGroups(new Set())
              : setExpandedGroups(new Set(allKeys))
          }
          className="gf-btn h-8 px-3 text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 ml-auto"
        >
          {allExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {allExpanded ? "Comprimi tutto" : "Espandi tutto"}
        </button>
      </div>

      {/* ── Days ──
          Desktop: all 7 visible in scroll
          Mobile:  only days[0] (= fromDate), navigation advances day-by-day  */}
      {days.map((day, i) => (
        <div key={day.date} className={i > 0 ? "hidden md:block" : ""}>
          <DaySection
            day={day}
            expandedGroups={expandedGroups}
            onToggle={toggleGroup}
            onSuccess={handleSuccess}
            attivita={attivita}
            commesse={commesse}
          />
        </div>
      ))}
    </>
  );
}
