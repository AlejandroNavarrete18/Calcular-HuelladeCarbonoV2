import { Inbox } from 'lucide-react';
import Checkbox from './Checkbox.jsx';

/**
 * Tabla para pantallas anchas y lista de tarjetas en el celular (nada de desplazarse de lado).
 *
 * @param {object} props
 * @param {Array<{key: string, header: string, render: (row: object) => import('react').ReactNode, className?: string, mobileTitle?: boolean}>} props.columns
 *   Una columna sin `header` (acciones) se muestra al pie de la tarjeta. `mobileTitle` pone la columna como encabezado de la tarjeta.
 * @param {object[]} props.rows
 * @param {(row: object) => string | number} props.rowKey
 * @param {string} [props.emptyText]
 * @param {{selected: Set<number>, onToggle: (row: object) => void, onToggleAll: () => void, selectable?: (row: object) => boolean}} [props.selection]
 *   Si se indica, cada fila lleva una casilla.
 */
export default function DataTable({ columns, rows, rowKey, emptyText = 'No hay resultados.', selection }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
        <Inbox className="w-8 h-8" aria-hidden="true" />
        <p className="font-semibold">{emptyText}</p>
      </div>
    );
  }

  const title = columns.find((column) => column.mobileTitle);
  const actions = columns.filter((column) => !column.header);
  const details = columns.filter((column) => column.header && column !== title);

  let allSelected = false;
  let someSelected = false;
  if (selection) {
    const selectableRows = rows.filter((row) => !selection.selectable || selection.selectable(row));
    allSelected = selectableRows.length > 0 && selectableRows.every((row) => selection.selected.has(rowKey(row)));
    someSelected = !allSelected && selectableRows.some((row) => selection.selected.has(rowKey(row)));
  }

  return (
    <>
      {/* Pantallas anchas: tabla */}
      <div className="scroll-x max-md:hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50 text-left font-display text-[0.7rem] uppercase tracking-wider text-navy-800">
              {selection && (
                <th scope="col" className="w-12 px-3 py-2.5">
                  <Checkbox label="Elegir todas las filas" checked={allSelected} indeterminate={someSelected} onChange={selection.onToggleAll} />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-bold ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-navy-50/60">
                {selection && (
                  <td className="px-3 py-2.5 align-top">
                    {(!selection.selectable || selection.selectable(row)) && (
                      <Checkbox label={`Elegir fila ${rowKey(row)}`} checked={selection.selected.has(rowKey(row))} onChange={() => selection.onToggle(row)} />
                    )}
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-top ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celular: una tarjeta por fila */}
      <div className="md:hidden">
        {selection && (
          <div className="flex items-center gap-1 border-b border-navy-100 bg-navy-50 px-2 py-1 text-sm font-semibold text-navy-800">
            <Checkbox label="Elegir todas las filas" checked={allSelected} indeterminate={someSelected} onChange={selection.onToggleAll} />
            Elegir todas las de esta página
          </div>
        )}
        <ul className="divide-y divide-navy-100">
          {rows.map((row) => (
            <li key={rowKey(row)} className="flex gap-1 px-3 py-3.5">
              {selection && (
                <div className="shrink-0 pt-0.5">
                  {(!selection.selectable || selection.selectable(row)) && (
                    <Checkbox label={`Elegir fila ${rowKey(row)}`} checked={selection.selected.has(rowKey(row))} onChange={() => selection.onToggle(row)} />
                  )}
                  {selection.selectable && !selection.selectable(row) && <span className="block h-11 w-11" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && <div className="break-words font-semibold text-ink">{title.render(row)}</div>}
                <dl className="mt-1.5 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  {details.map((column) => (
                    <div key={column.key} className="contents">
                      <dt className="pt-0.5 text-xs font-bold uppercase tracking-wide text-muted">{column.header}</dt>
                      <dd className="min-w-0 break-words">{column.render(row)}</dd>
                    </div>
                  ))}
                </dl>
                {actions.length > 0 && <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">{actions.map((column) => <div key={column.key}>{column.render(row)}</div>)}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
