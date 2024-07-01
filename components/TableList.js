import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/Hierarchy.module.css';
import { RxCaretUp, RxCaretDown, RxCaretSort, RxMagnifyingGlass } from "react-icons/rx";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper,
  getFilteredRowModel,
  getSortedRowModel 
} from '@tanstack/react-table';

const Table = ({ data }) => {
  const tableRef = useRef(null);
  const inputRef = useRef(null);
  const columnHelper = createColumnHelper();
  
  const [filtering, setFiltering] = useState('')

  const columns = [
    {
      id: 'select', // Unique ID for the select column
      header: ({ table }) => (
        <input
          type="checkbox"
          onChange={table.getToggleAllRowsSelectedHandler()}
          checked={table.getIsAllRowsSelected()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          onChange={row.getToggleSelectedHandler()}
          checked={row.getIsSelected()}
        />
      ),
    },
    ...Object.keys(data[0]).map((key) => columnHelper.accessor(key, { header: key }))
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter: filtering
    },
    onGlobalFilterChange: setFiltering
  });

  const [parentDimensions, setParentDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (tableRef.current) {
      const parentContainer = tableRef.current.parentNode;
      if (parentContainer) {
        const { clientWidth, clientHeight } = parentContainer;
        const inputHeight = inputRef.current ? inputRef.current.offsetHeight : 0;

        setParentDimensions({ width: clientWidth, height: clientHeight - inputHeight });
      }
    }
  }, []);

  return (
    <div ref={tableRef}>
      <div className={styles.searchBar}>
      <input
          ref={inputRef}
          type="text"
          value={filtering}
          onChange={(e) => setFiltering(e.target.value)}
          placeholder="Search node"
          className={styles.searchInput}
        />
        <RxMagnifyingGlass className={styles.searchIcon} />
      </div>
    <div
      className={styles.tableContainer}
      style={{
        maxHeight: `${parentDimensions.height}px`,
        maxWidth: `${parentDimensions.width}px`,
        overflow: 'auto'
      }}
    >
      <table className={styles.table}> 
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th 
                  key={header.id} 
                  style={{ 
                    width: header.getSize(),
                    cursor: header.column.getCanSort() ? "pointer" : "default",
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className={styles.headerCell}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    <span className={styles.sortIcon}>
                      {header.column.getCanSort() &&
                        (header.column.getIsSorted() === "asc" ? (
                          <RxCaretUp />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <RxCaretDown />
                        ) : (
                          <RxCaretSort />
                        ))}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default Table;