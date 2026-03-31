"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createCommessa, updateCommessa, deleteCommessa } from "./actions";
import type { ActionResult } from "./actions";

// ============================================================
// Tipi
// ============================================================
export type Commessa = {
  codcommessa: string;
  descrizione: string;
  attiva: boolean | null;
};

// ============================================================
// Dialog aggiunta / modifica
// ============================================================
function CommessaDialog({
  item,
  onClose,
  onDone,
}: {
  item: Commessa | null; // null = nuova
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const isEdit = item !== null;
  const [cod, setCod] = useState(item?.codcommessa ?? "");
  const [descrizione, setDescrizione] = useState(item?.descrizione ?? "");
  const [attiva, setAttiva] = useState(item?.attiva ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!cod.trim() || !descrizione.trim()) {
      setError("Codice e descrizione sono obbligatori.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateCommessa(cod, descrizione, attiva)
        : await createCommessa(cod, descrizione, attiva);
      if (result.ok) { onDone(result.message); onClose(); }
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="gf-card w-full max-w-md shadow-xl">
        <h2 className="gf-h2 mb-5">
          {isEdit ? "Modifica commessa" : "Nuova commessa"}
        </h2>

        {error && <div className="gf-error mb-4">{error}</div>}

        <div className="flex flex-col gap-4 mb-6">
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
              placeholder="Es. Progetto Alpha"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attiva}
              onChange={(e) => setAttiva(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-700">Attiva</span>
          </label>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="gf-card w-full max-w-sm shadow-xl">
        <h2 className="gf-h2 mb-2">Elimina commessa</h2>
        <p className="gf-help mb-1">
          Stai per eliminare <strong>{item.codcommessa}</strong>:
        </p>
        <p className="text-sm text-slate-900 mb-4">{item.descrizione}</p>
        <p className="gf-help mb-5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
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
// Componente principale
// ============================================================
export function CommesseClient({ items }: { items: Commessa[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Commessa | null>(null);
  const [deleteItem, setDeleteItem] = useState<Commessa | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

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
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setAddOpen(true)}
          className="gf-btn h-9 px-4 bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          <Plus size={16} />
          Aggiungi commessa
        </button>
      </div>

      {/* ── Desktop: tabella ────────────────────────────────── */}
      <div className="gf-card p-0 overflow-hidden hidden md:block">
        {items.length === 0 ? (
          <div className="py-12 text-center gf-muted">Nessuna commessa.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Descrizione</th>
                  <th>Stato</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.codcommessa}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.codcommessa}
                      </span>
                    </td>
                    <td>{c.descrizione}</td>
                    <td>
                      <span className={`badge ${c.attiva ? "badge-approved" : "badge-cancelled"}`}>
                        {c.attiva ? "Attiva" : "Non attiva"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditItem(c)}
                          className="gf-btn h-8 px-3 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                        >
                          <Pencil size={13} /> Modifica
                        </button>
                        <button
                          onClick={() => setDeleteItem(c)}
                          className="gf-btn h-8 px-3 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        >
                          <Trash2 size={13} /> Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile: card list ───────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="py-12 text-center gf-muted">Nessuna commessa.</div>
        ) : (
          items.map((c) => (
            <div key={c.codcommessa} className="gf-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {c.codcommessa}
                  </span>
                  <p className="font-medium text-slate-900 text-sm mt-2 leading-snug">
                    {c.descrizione}
                  </p>
                </div>
                <span className={`badge flex-shrink-0 ${c.attiva ? "badge-approved" : "badge-cancelled"}`}>
                  {c.attiva ? "Attiva" : "Non attiva"}
                </span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditItem(c)}
                  className="gf-btn flex-1 h-10 text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  <Pencil size={15} /> Modifica
                </button>
                <button
                  onClick={() => setDeleteItem(c)}
                  className="gf-btn flex-1 h-10 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                >
                  <Trash2 size={15} /> Elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
