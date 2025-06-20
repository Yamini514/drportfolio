import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

function CustomTable({ headers, children, onBulkDelete, enableBulkDelete = false }) {
  const { currentTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const rowsPerPage = 8;

  const totalRows = React.Children.count(children);
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = React.Children.toArray(children).slice(indexOfFirstRow, indexOfLastRow);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(currentRows.map(row => row.key));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const handleBulkDeleteClick = () => {
    if (selectedRows.length > 1) {
      onBulkDelete?.(selectedRows);
      setSelectedRows([]);
    }
  };

  return (
    <div>
      {enableBulkDelete && selectedRows.length > 1 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleBulkDeleteClick}
            className="px-4 py-2 rounded transition-colors duration-200"
            style={{
              backgroundColor: currentTheme.primary,
              color: currentTheme.text.primary === '#ffffff' ? '#000000' : '#ffffff',
              border: `1px solid ${currentTheme.border}`,
              cursor: 'pointer',
            }}
          >
            Delete Selected
          </button>
        </div>
      )}
      <div className="relative w-full rounded-lg overflow-hidden" style={{ border: `1.8px solid ${currentTheme.primary}`, backgroundColor: currentTheme.surface, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full table-fixed min-w-[640px]" style={{ backgroundColor: currentTheme.surface, borderCollapse: 'collapse' }}>
            <thead className="sticky top-0 z-10" style={{ backgroundColor: currentTheme.primary, borderColor: currentTheme.border }}>
              <tr>
                {enableBulkDelete && (
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={currentRows.length > 0 && selectedRows.length === currentRows.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                )}
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className={`py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap overflow-hidden overflow-ellipsis ${index === 0 ? 'text-left pl-6' : 'text-center px-3'}`}
                    style={{ color: '#ffffff', maxWidth: '150px', textOverflow: 'ellipsis' }}
                    title={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.text.primary }}>
              {totalRows > 0 ? (
                React.Children.map(currentRows, (child) => {
                  if (!React.isValidElement(child)) return child;
                  const rowId = child.key;
                  const enhancedCells = [
                    enableBulkDelete && (
                      <td key="checkbox" className="py-3 pl-4 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowId)}
                          onChange={() => handleSelectRow(rowId)}
                          className="w-4 h-4"
                        />
                      </td>
                    ),
                    ...React.Children.map(child.props.children, (cell, cellIndex) => {
                      if (!React.isValidElement(cell)) return cell;
                      let cellContent = '';
                      if (typeof cell.props.children === 'string') cellContent = cell.props.children;
                      const cellClassName = `${cellIndex === 0 ? 'text-left pl-6' : 'text-center'} py-3 whitespace-nowrap overflow-hidden overflow-ellipsis`;
                      return React.cloneElement(cell, {
                        className: `${cellClassName} ${cell.props.className || ''}`,
                        style: { ...cell.props.style, maxWidth: '150px', textOverflow: 'ellipsis', color: currentTheme.text.primary },
                        title: cellContent,
                      });
                    }),
                  ].filter(Boolean);
                  return React.cloneElement(child, { className: `${child.props.className || ''}`, children: enhancedCells });
                })
              ) : (
                <tr>
                  <td colSpan={headers.length + (enableBulkDelete ? 1 : 0)} className="px-3 py-8 text-center text-sm" style={{ color: currentTheme.text.secondary }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalRows > rowsPerPage && (
          <div className="flex justify-end items-center gap-2 p-4" style={{ borderTop: `1px solid ${currentTheme.border}` }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded"
              style={{ backgroundColor: currentPage === 1 ? currentTheme.border : currentTheme.primary, color: currentPage === 1 ? currentTheme.text.secondary : '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded"
              style={{ backgroundColor: currentPage === totalPages ? currentTheme.border : currentTheme.primary, color: currentPage === totalPages ? currentTheme.text.secondary : '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
            <span style={{ color: currentTheme.text.primary }}>Page {currentPage} of {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomTable;