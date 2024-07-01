import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const Table = ({ data, mainCharacter, setMainCharacter, onRowClick, currentGroup, currentGraphId }) => {
  const tableRef = useRef(null);
  const inputRef = useRef(null);
  const columnHelper = createColumnHelper();
  
  const [filtering, setFiltering] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

  let columns = [];
  if(data.length > 0){
    columns = [
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
            value={data[row.id].id}
            id={`input-main-character-${data[row.id].id}`}
          />
        ),
      },
      ...Object.keys(data[0]).map((key) => columnHelper.accessor(key, { header: key }))
    ];
  }

  const dataIndex = {};
  if(data) {
    data.forEach((value, index) => {
      dataIndex[value.id] = index;
    });
  }

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

  useEffect(() => {    
    if(mainCharacter[currentGraphId] === undefined) {
      return;
    }
    const newRowSelection = {}
    mainCharacter[currentGraphId].forEach((id) => {
      newRowSelection[dataIndex[id]] = true;
    });
    table.setRowSelection(newRowSelection);
  }, [data]);

  const [parentDimensions, setParentDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (tableRef.current) {
      const parentContainer = tableRef.current.parentNode;
      if (parentContainer) {
        const { clientWidth, clientHeight } = parentContainer;
        const inputHeight = inputRef.current ? inputRef.current.offsetHeight : 0;

        setParentDimensions({ width: clientWidth, height: clientHeight - 100 - inputHeight });
      }
    }
  }, []);

  function getAllChosenCharacter(e) {
    let chosenNodes = Array.from(e.target.form.querySelectorAll("input[type=checkbox]:checked"));
    let chosenNodeIds = chosenNodes.map((node) => node.value);
    if(chosenNodeIds.filter((id) => id === "on").length > 0){
      chosenNodes = Array.from(e.target.form.querySelectorAll("input[type=checkbox]"));
      chosenNodeIds = chosenNodes.map((node) => node.value);
      return chosenNodeIds;
    }
    if(e.target.value === "on" && !e.target.checked) {
      chosenNodes = Array.from([]);
      chosenNodeIds = chosenNodes.map((node) => node.value);
      return chosenNodeIds;
    }
    return chosenNodeIds;
  }

  function handleCharacterChange(e) {
    const allChosenCharacter = getAllChosenCharacter(e);
    mainCharacter[currentGraphId] = allChosenCharacter;
    setMainCharacter({...mainCharacter});
  }

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
      <form id="main_character_form" onChange={handleCharacterChange}>
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
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={hoveredRow === row.id ? styles.hoveredRow : ''}
                  onClick={() => onRowClick(row.original.id)} // Call the onRowClick function with the node ID as an argument
                >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </form>
    </div>
    </div>
  );
};

export default Table;