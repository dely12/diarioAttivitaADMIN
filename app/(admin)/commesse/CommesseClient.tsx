"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { createCommessa, updateCommessa, deleteCommessa, getNextCodcommessa } from "./actions";
import type { ActionResult, CommessaInput } from "./actions";
import { useToast } from "@/lib/useToast";

// ============================================================
// Tipi
// ============================================================
export type Commessa = {
  codcommessa: string;
  descrizione: string;
  attiva: boolean | null;
  qta: number | null;
  modello: string | null;
  capacita: number | null;
  ore_serbatoi: number | null;
  ore_accessori: number | null;
  ore_coibentazione: number | null;
  tot_ore_vendute: number | null;
  ore_lavorate: number | null;
};

// ============================================================
// Helpers
// ============================================================
function fmtOre(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return `${val.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h`;
}

function fmtNum(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("it-IT");
}

// Barra avanzamento ore lavorate / vendute
function OreBar({ lavorate, vendute }: { lavorate: number | null; vendute: number | null }) {
  const lav = lavorate ?? 0;
  const vend = vendute ?? 0;
  if (lav <= 0 && vend <= 0) return null;

  const over = lav > vend;
  const pct = vend > 0 ? (over ? 100 : Math.round((lav / vend) * 100)) : (lav > 0 ? 100 : 0);
  const color = over ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {over ? (
        <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">
          +{(lav - vend).toLocaleString("it-IT", { maximumFractionDigits: 2 })} h sforamento
        </span>
      ) : vend > 0 ? (
        <span className="text-[10px] text-slate-400 mt-0.5 block">{pct}% utilizzate</span>
      ) : null}
    </div>
  );
}

// ============================================================
// Riga numerica per il dialog (label + input number)
// ============================================================
function NumInput({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
      />
    </div>
  );
}

// ============================================================
// Dialog aggiunta / modifica
// ============================================================
function CommessaDialog({
  item,
  onClose,
  onDone,
}: {
  item: Commessa | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const isEdit = item !== null;
  const [cod,              setCod]              = useState(item?.codcommessa ?? "");
  const [descrizione,      setDescrizione]      = useState(item?.descrizione ?? "");
  const [attiva,           setAttiva]           = useState(item?.attiva ?? true);
  const [modello,          setModello]          = useState(item?.modello ?? "");
  const [qta,              setQta]              = useState(item?.qta?.toString() ?? "");
  const [capacita,         setCapacita]         = useState(item?.capacita?.toString() ?? "");
  const [oreSerbatoi,      setOreSerbatoi]      = useState(item?.ore_serbatoi?.toString() ?? "");
  const [oreAccessori,     setOreAccessori]     = useState(item?.ore_accessori?.toString() ?? "");
  const [oreCoibentazione, setOreCoibentazione] = useState(item?.ore_coibentazione?.toString() ?? "");
  const [error,            setError]            = useState<string | null>(null);
  const [pending,          startTransition]     = useTransition();

  useEffect(() => {
    if (!isEdit) {
      getNextCodcommessa().then(setCod);
    }
  }, [isEdit]);

  function toNum(s: string): number | null {
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function handleSubmit() {
    if (!cod.trim() || !descrizione.trim()) {
      setError("Codice e descrizione sono obbligatori.");
      return;
    }
    setError(null);

    const input: CommessaInput = {
      codcommessa:       cod,
      descrizione,
      attiva,
      modello:           modello || null,
      qta:               toNum(qta),
      capacita:          toNum(capacita),
      ore_serbatoi:      toNum(oreSerbatoi),
      ore_accessori:     toNum(oreAccessori),
      ore_coibentazione: toNum(oreCoibentazione),
    };

    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateCommessa(input)
        : await createCommessa(input);
      if (result.ok) { onDone(result.message); onClose(); }
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="gf-card w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
        <h2 className="gf-h2 mb-5">
          {isEdit ? "Modifica commessa" : "Nuova commessa"}
        </h2>

        {error && <div className="gf-error mb-4">{error}</div>}

        {/* Dati principali */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="cod-commessa">Codice</label>
            <input
              id="cod-commessa"
              type="text"
              value={cod}
              disabled={isEdit}
              onChange={(e) => setCod(e.target.value.toUpperCase())}
              placeholder="Es. COMM001"
              className={isEdit ? "opacity-50 cursor-not-allowed" : ""}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="desc-commessa">Descrizione</label>
            <input
              id="desc-commessa"
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es. Serbatoio inox 10.000 L"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="modello-commessa">Modello <span className="text-slate-400 font-normal">(opzionale)</span></label>
            <input
              id="modello-commessa"
              type="text"
              value={modello}
              onChange={(e) => setModello(e.target.value)}
              placeholder="Es. V10000"
            />
          </div>
        </div>

        {/* Dati tecnici */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dati tecnici</p>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <NumInput id="qta"              label="Quantità"         value={qta}              onChange={setQta} />
          <NumInput id="capacita"         label="Capacità (L)"     value={capacita}         onChange={setCapacita} />
          <NumInput id="ore-serbatoi"     label="Ore serbatoi"     value={oreSerbatoi}      onChange={setOreSerbatoi} />
          <NumInput id="ore-accessori"    label="Ore accessori"    value={oreAccessori}     onChange={setOreAccessori} />
          <NumInput id="ore-coibentazione" label="Ore coibentazione" value={oreCoibentazione} onChange={setOreCoibentazione} />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none mb-6">
          <input
            type="checkbox"
            checked={attiva}
            onChange={(e) => setAttiva(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">Attiva</span>
        </label>

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
            className="gf-btn h-9 px-4 bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            {pending ? "Salvataggio…" : isEdit ? "Salva modifiche" : "Crea commessa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dialog conferma eliminazione
// ============================================================
function DeleteDialog({
  item,
  onClose,
  onDone,
}: {
  item: Commessa;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommessa(item.codcommessa);
      if (result.ok) { onDone(result.message); onClose(); }
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="gf-card w-full max-w-sm shadow-xl max-h-[90dvh] overflow-y-auto">
        <h2 className="gf-h2 mb-2">Elimina commessa</h2>
        <p className="gf-help mb-1">
          Stai per eliminare <strong>{item.codcommessa}</strong>:
        </p>
        <p className="text-sm text-slate-900 mb-4">{item.descrizione}</p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
          Attenzione: l&apos;operazione non è reversibile.
        </p>
        {error && <div className="gf-error mb-4">{error}</div>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={pending}
            className="gf-btn h-9 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="gf-btn h-9 px-4 bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            {pending ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Riga desktop espandibile
// ============================================================
function CommessaRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Commessa;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td>
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {item.codcommessa}
          </span>
          {item.modello && (
            <span className="ml-2 text-xs text-slate-400">{item.modello}</span>
          )}
        </td>
        <td className="max-w-xs">
          <div className="truncate">{item.descrizione}</div>
        </td>
        <td>
          <span className={`badge ${item.attiva ? "badge-approved" : "badge-cancelled"}`}>
            {item.attiva ? "Attiva" : "Non attiva"}
          </span>
        </td>
        <td className="text-right tabular-nums">
          {(() => {
            const over = item.tot_ore_vendute != null && (item.ore_lavorate ?? 0) > item.tot_ore_vendute;
            return (
              <>
                <div className={over ? "font-semibold text-red-600" : ""}>
                  {fmtOre(item.ore_lavorate)}
                </div>
                {item.tot_ore_vendute != null && (
                  <div className="text-xs text-slate-400">/ {fmtOre(item.tot_ore_vendute)}</div>
                )}
                <OreBar lavorate={item.ore_lavorate} vendute={item.tot_ore_vendute} />
              </>
            );
          })()}
        </td>
        <td>
          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="gf-btn h-8 px-3 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              <Pencil size={13} /> Modifica
            </button>
            <button
              onClick={onDelete}
              className="gf-btn h-8 px-3 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            >
              <Trash2 size={13} /> Elimina
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Dettagli espansi */}
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-slate-50 border-t border-b border-slate-100 px-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Quantità</div>
                  <div className="font-medium text-slate-800">{fmtNum(item.qta)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Capacità</div>
                  <div className="font-medium text-slate-800">{item.capacita != null ? `${fmtNum(item.capacita)} L` : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore serbatoi</div>
                  <div className="font-medium text-slate-800">{fmtOre(item.ore_serbatoi)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore accessori</div>
                  <div className="font-medium text-slate-800">{fmtOre(item.ore_accessori)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore coibentazione</div>
                  <div className="font-medium text-slate-800">{fmtOre(item.ore_coibentazione)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Tot. ore vendute</div>
                  <div className="font-medium text-slate-800">{fmtOre(item.tot_ore_vendute)}</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================
// Card mobile
// ============================================================
function CommessaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Commessa;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="gf-card">
      {/* Intestazione */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {item.codcommessa}
            </span>
            {item.modello && (
              <span className="text-xs text-slate-400">{item.modello}</span>
            )}
          </div>
          <p className="font-medium text-slate-900 text-sm mt-1.5 leading-snug">{item.descrizione}</p>
        </div>
        <span className={`badge shrink-0 ${item.attiva ? "badge-approved" : "badge-cancelled"}`}>
          {item.attiva ? "Attiva" : "Non attiva"}
        </span>
      </div>

      {/* Ore sintetiche */}
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-0.5">Ore lavorate / vendute</div>
          {(() => {
            const over = item.tot_ore_vendute != null && (item.ore_lavorate ?? 0) > item.tot_ore_vendute;
            return (
              <div className={`text-sm tabular-nums ${over ? "font-semibold text-red-600" : "font-semibold text-slate-800"}`}>
                {fmtOre(item.ore_lavorate)}
                {item.tot_ore_vendute != null && (
                  <span className="font-normal text-slate-400"> / {fmtOre(item.tot_ore_vendute)}</span>
                )}
              </div>
            );
          })()}
          <OreBar lavorate={item.ore_lavorate} vendute={item.tot_ore_vendute} />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="gf-btn h-8 px-3 text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Dettagli
        </button>
      </div>

      {/* Dettagli espansi */}
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-slate-100 pt-3 mb-3">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Quantità</div>
            <div className="font-medium text-slate-800">{fmtNum(item.qta)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Capacità</div>
            <div className="font-medium text-slate-800">{item.capacita != null ? `${fmtNum(item.capacita)} L` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore serbatoi</div>
            <div className="font-medium text-slate-800">{fmtOre(item.ore_serbatoi)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore accessori</div>
            <div className="font-medium text-slate-800">{fmtOre(item.ore_accessori)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Ore coibentazione</div>
            <div className="font-medium text-slate-800">{fmtOre(item.ore_coibentazione)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Tot. ore vendute</div>
            <div className="font-medium text-slate-800">{fmtOre(item.tot_ore_vendute)}</div>
          </div>
        </div>
      )}

      {/* Azioni */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="gf-btn flex-1 h-10 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
        >
          <Pencil size={15} /> Modifica
        </button>
        <button
          onClick={onDelete}
          className="gf-btn flex-1 h-10 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
        >
          <Trash2 size={15} /> Elimina
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Componente principale
// ============================================================
export function CommesseClient({ items }: { items: Commessa[] }) {
  const [addOpen,    setAddOpen]    = useState(false);
  const [editItem,   setEditItem]   = useState<Commessa | null>(null);
  const [deleteItem, setDeleteItem] = useState<Commessa | null>(null);
  const [query,      setQuery]      = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast, showToast } = useToast();

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(val), 300);
  }

  const filtered = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.codcommessa.toLowerCase().includes(q) ||
        c.descrizione.toLowerCase().includes(q) ||
        (c.modello ?? "").toLowerCase().includes(q)
    );
  }, [items, debouncedQ]);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 gf-card bg-emerald-50 border-emerald-200 text-emerald-800 text-sm shadow-lg px-4 py-3">
          {toast}
        </div>
      )}

      {/* Dialog */}
      {addOpen && (
        <CommessaDialog item={null} onClose={() => setAddOpen(false)} onDone={showToast} />
      )}
      {editItem && (
        <CommessaDialog item={editItem} onClose={() => setEditItem(null)} onDone={showToast} />
      )}
      {deleteItem && (
        <DeleteDialog item={deleteItem} onClose={() => setDeleteItem(null)} onDone={showToast} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-full md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Cerca per codice, descrizione, modello…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="gf-btn h-9 px-4 bg-blue-600 text-white hover:bg-blue-700 text-sm md:ml-auto"
        >
          <Plus size={16} />
          Aggiungi commessa
        </button>
      </div>

      {/* ── Desktop: tabella espandibile ────────────────────── */}
      <div className="gf-card p-0 overflow-hidden hidden md:block">
        {filtered.length === 0 ? (
          <div className="py-12 text-center gf-muted">
            {debouncedQ ? "Nessun risultato." : "Nessuna commessa."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Codice / Modello</th>
                  <th>Descrizione</th>
                  <th>Stato</th>
                  <th className="text-right">Ore lav. / vend.</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CommessaRow
                    key={c.codcommessa}
                    item={c}
                    onEdit={() => setEditItem(c)}
                    onDelete={() => setDeleteItem(c)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile: card list ───────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center gf-muted">
            {debouncedQ ? "Nessun risultato." : "Nessuna commessa."}
          </div>
        ) : (
          filtered.map((c) => (
            <CommessaCard
              key={c.codcommessa}
              item={c}
              onEdit={() => setEditItem(c)}
              onDelete={() => setDeleteItem(c)}
            />
          ))
        )}
      </div>
    </>
  );
}
