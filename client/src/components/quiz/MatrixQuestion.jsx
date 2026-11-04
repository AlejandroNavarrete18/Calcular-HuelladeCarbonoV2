// Fondo alterno por fila para facilitar la lectura de la tabla (solo en pantallas anchas).
function getRowClassName(index) {
  const base = 'sm:border-t sm:border-navy-100 sm:hover:bg-gold-300/20 max-sm:block max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-navy-100 max-sm:overflow-hidden';
  if (index % 2 === 1) {
    return `${base} sm:bg-navy-50/60`;
  }
  return `${base} sm:bg-white`;
}

//Preguntas matriciales (tabla): una opción por fila
// Responsive: en pantallas pequeñas se muestra como una lista de botones por fila
export default function MatrixQuestion({ question, answer, onSelectCell }) {
  const selection = answer ?? {};

  return (
    <div className="my-6 rounded-xl sm:border sm:border-navy-100 sm:overflow-x-auto">
      <table className="w-full text-left border-collapse sm:min-w-[500px] max-sm:block">
        <thead className="max-sm:hidden">
          <tr className="bg-navy-900 text-white">
            <th className="p-3" />
            {question.columns.map((column) => (
              <th key={column.id} className="p-3 text-xs font-bold text-center font-display">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-sm:block">
          {question.rows.map((row, index) => (
            <tr key={row.id} className={getRowClassName(index)}>
              <td className="p-3 font-semibold text-sm text-navy-900 max-sm:block max-sm:bg-navy-900 max-sm:text-white max-sm:font-display max-sm:uppercase max-sm:tracking-wide">
                {row.label}
              </td>
              {question.columns.map((column) => (
                <td key={column.id} className="sm:p-3 text-center max-sm:block max-sm:border-t max-sm:border-navy-100 max-sm:bg-white">
                  <label className="flex items-center justify-between sm:justify-center gap-3 px-3 py-3.5 sm:p-0 cursor-pointer max-sm:active:bg-navy-50">
                    {/* En teléfono se muestra el nombre de la columna junto a su botón */}
                    <span className="sm:hidden text-sm font-semibold text-navy-900 text-left">{column.label}</span>
                    <input
                      type="radio"
                      aria-label={`${row.label}: ${column.label}`}
                      name={`${question.id}_${row.id}`}
                      checked={selection[row.id] === column.id}
                      onChange={() => onSelectCell(question.id, row.id, column.id)}
                      className="w-6 h-6 sm:w-5 sm:h-5 shrink-0 cursor-pointer"
                    />
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
