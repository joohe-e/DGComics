import React, { use, useEffect, useRef, useState, memo, useLayoutEffect } from 'react';
import styles from '../styles/Hierarchy.module.css';
import { RxCaretUp, RxCaretDown, RxCaretSort, RxMagnifyingGlass } from "react-icons/rx";
import {io5IoCheckboxOutline, io5IoCheckbox} from "react-icons/io5";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight, MdOutlineKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from "react-icons/md";
import Chart from './Minichart';
import Heatmap from './Heatmap';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { getCommunityChange, getListOfGraphs } from '../api/graph';
import * as d3 from 'd3';
import { getAllChosenCharacter } from '../api/info';

const EMPTY_ARRAY = [];
const character_checked = {
  main: {},
  support: {},
};

const color = {

}

const edit_checked = {
  main: {},
  support: {},
}

let class_value = {}

let chosenGraph = null;

export function getFilterChosenGraph() {
  return chosenGraph;
}

export function getFilterEditChecked() {
  return edit_checked["support"];
}

export function resetFilterEditChecked() {
  Object.keys(edit_checked["support"]).forEach(key => {
    edit_checked["support"][key] = false;
  });
}

export function resetRowColor() {
  const className = "support"; // Replace with your actual class name
  const tab = document.getElementById(`filter-${className}`);
  
  if (tab) {
    for (const row of tab.rows) {
      row.style.backgroundColor = "#ffffff"; // Change background color to white
    }
  }
}

const Filter = memo(({  from_to,
                        data_name,
                        data,  
                        chartData, 
                        domain, 
                        dissim,
                        attributes,
                        selectedAttribute,
                        setSelectedAttribute,
                        className, 
                        initSelect, 
                        accessor, 
                        onRowClick, 
                        characters, 
                        setCharacters, 
                        currentGraph, 
                        commIds,
                        setCommIds,
                        range,
                        classes,
                        setClasses,
                        sankeyMode,
                        selectedSankey,
                        setSelectedSankey,
                        setGraphList,
                        mode,
                      }) => {
  const tableRef = useRef(null);
  const inputRef = useRef(null);
  const columnHelper = createColumnHelper(); 
  
  const [filtering, setFiltering] = useState('');
  const [clickedRow, setClickedRow] = useState(null);
  const [pageGroupStart, setPageGroupStart] = useState(0);

  let pageNum = 5;
  if(className==="setMainCharacter") {
    pageNum = 5;
  } else if (className==="support") {
    pageNum = 2;
    data.forEach((d, idx) => {
      d.weight = parseFloat(d.weight.toFixed(2));
    });
  } else {
    pageNum = 4;
  }

  useEffect(() => {
    window.addEventListener("edit", resetRowColor);
  }, []);

  useEffect(() => {
    async function updateCommIds() {
      if(!selectedSankey) return;
      const allChosenCharacter = Object.keys(selectedSankey);
      const from = from_to[0];
      const to = from_to[1];
      const community_change = await getCommunityChange(data_name, allChosenCharacter, sankeyMode, from, to);
  
      let sankeyData = allChosenCharacter.map(character => ({
          nodeIds: community_change[character.replaceAll("_", " ")] || [], // Adjust as needed.
          color: selectedSankey[character] || "#e66465", // Default color if not defined.
          graphId: currentGraph,
          character,
      }));

      // Directly update commIds with new sankey data
      setCommIds(sankeyData);
    }

    updateCommIds();
}, [selectedSankey]); // Re-run this effect whenever selectedSankey changes.


  let columns = [
    columnHelper.accessor('id', { header: 'Node', enableSorting: true }),
    ...accessor.map(attr => {
      const header = attr.replace(/_/g, " ");
      const capitalizedHeader = attr.includes("min" || "max" || "avg") ? 
                                header.charAt(0).toUpperCase() + header.slice(1) + '.' 
                                : header.charAt(0).toUpperCase() + header.slice(1);
      return columnHelper.accessor(attr, { header: capitalizedHeader, enableSorting: true });
    })
  ];

  const measureTextSize = (text) => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext("2d");
    ctx.font = "8px";        
    let width = ctx.measureText(text).width    
    const lsize = { width };
    return lsize;
  };

  const maxTextSize = (textArray) => {
    let maxSize = { width: 0 };
    textArray.forEach(text => {
      d3.format(".2f")(text)
      const size = measureTextSize(text);
      if(size.width > maxSize.width) {
        maxSize = size;
      }
    });
    return maxSize;
  }

  let maxSize = 0;
  if(chartData) {
    const textArray = Object.values(chartData).map(d => selectedAttribute === "category"? 1 : +d[selectedAttribute]);
    maxSize = maxTextSize(textArray);
  }

  const miniChart = {
    id: 'chart-cell', // Unique ID for the chart column
    header: 'Attribute',
    cell: ({ row }) => (
        <Chart
          data={chartData[row.original.id]}
          attribute={selectedAttribute}
          width="100"
          height="40"
          domain={domain}
          maxSize={maxSize}
        />
    ),
  };

  const heatMap = {
    id: 'chart-cell', // Unique ID for the chart column
    header: 'Distance',
    cell: ({ row }) => (
        <Heatmap
          data={chartData[row.original.id]}
          attribute={selectedAttribute}
          width="100"
          height="40"
          domain={domain}
          dissim={dissim[row.original.id.replace(/_/g, " ")]}
          metadata={dissim.metadata}
        />
    ),
  };

  const characterSelection = {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        style={{borderRadius: "5px"}}
        onChange={(e) => {
          const allRows = table.getRowModel().rowsById;
          const is_all_selected = table.getIsAllRowsSelected();
          Object.keys(allRows).forEach((key) => {
            character_checked[className][allRows[key].original.id] = !is_all_selected;
          });
          handleCharacterSelect(e);
          table.getToggleAllRowsSelectedHandler()(e);
        }}
        checked={table.getIsAllRowsSelected()}
      />
    ),
    cell: ({ row }) => {
      const value = (className === "main")? data[row.id].id : JSON.stringify(data[row.id]);
      return (
      <input
        id={`character-select-${className}`}
        type="checkbox"
        onChange={(e) => {
          character_checked[className][row.original.id] = !character_checked[className][row.original.id];
          row.getToggleSelectedHandler()(e)
        }}
        checked={row.getIsSelected()}
        value={value}
      />
    )},
  };

  const sankeySelection = {
    id: 'sankey',
    header: 'Sankey',
    cell: (props) => {
      const row = props.row;
      const isChecked = selectedSankey.hasOwnProperty(row.original.id);
      const handleCheck = (e) => {
        const id = e.target.value; 
        const defaultColor = "#e66465"; 
        const exists = selectedSankey.hasOwnProperty(id); 
    
        let newList = { ...selectedSankey }; 
    
        if (exists) {
            delete newList[id];
        } else {
            newList[id] = color[row.original.id] ? color[row.original.id] : defaultColor;
        }
    
        setSelectedSankey(newList);
      };
      const handleColor = (e) => {
        const id = row.original.id;
        color[id] = e.target.value; 
        const exists = selectedSankey.hasOwnProperty(id); 
        if (exists) {
          setSelectedSankey(prevSelectedSankey => ({
            ...prevSelectedSankey,
            [id]: e.target.value, // Update the color for the specific id
          }));
        } 
      }
      return (
        <div className={styles.checkbox_container}>
            <div className={styles.checkbox_container}>
                <input
                    type="checkbox"
                    id={`sankey-select-${className}`}
                    onChange={handleCheck}
                    checked={isChecked}
                    value={data[row.id].id}
                    style={{ width: '0.7rem', height: '0.7rem', marginRight: '0.1rem'}}
                />
            </div>
            <div className={styles.checkbox_container}>
                <input
                    type="color"
                    id={styles.filter_swatch}
                    defaultValue="#e66465"
                    onChange={handleColor}
                    value={color[row.original.id]}
                />
            </div>
        </div>
    )},
  }

  /*const editSelection = {
    id: 'edit',
    header: <button 
      onClick={(e) => {
        const tab = document.getElementById(`filter-${className}`);
        for(const row of tab.rows) {
          row.style["background-color"] = "#ffffff";
        }
      }}
      type="button"
      id='edit-select'
      style={{
        backgroundColor: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "0.5rem",
        fontWeight: "bold",
        padding: "0px",
        // color: "#0070f3",
        // textDecoration: "underline",
      }}>
        Edit
    </button>,*/
    // cell: ({ row }) => {
    //   const value = (className === "main")? data[row.id].id : JSON.stringify({
    //     ...data[row.id],
    //     time: currentGraph,
    //   });
    //   return (
    //   <input
    //     id={`edit-select-${className}`}
    //     type="checkbox"
    //     onChange={() => { 
    //       edit_checked[className][row.original.id] = !edit_checked[className][row.original.id]; 
    //       chosenGraph = currentGraph;
    //     }}
    //     // checked={edit_checked[className][row.original.id]}
    //     value={value}
    //   />
    // )},
  // }

  const classSelection = {
    id: 'class',
    header: <button 
        type="button"
        id='class-select'
        className={styles.class_button}
        onClick={ (e) => { 
            document.getElementById('MainCharcterWrapper').style.flex = 1; 
            document.getElementById('SupportCharcterWrapper').style.display = 'none'; 
            handleClassClick(class_value)
          }}>
          Class
      </button>,
    cell: (props) => {
      const row = props.row;
      return (
        <input
          type="text"
          id={`class-select`}
          className={styles.class_input}
          onBlur={(e) => {if(e.target.value.length > 0) class_value[row.original.id] = e.target.value }}
          placeholder={class_value[row.original.id]}
        />
    )},
  }

  if(className !== "setMainCharacter") {
    columns = [
      characterSelection,
      sankeySelection,
      ...columns,];
  } else {
    columns.splice(1, 0, miniChart, heatMap);
  }

  if(className === "main"){
    columns.push(classSelection);
  }

  // if(className === "main"){
  //   columns.push(classSelection);
  // }

  // if(className === "support") {
  //   columns.push(editSelection);
  // }
 
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { 
      globalFilter: filtering,
    },
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
    onGlobalFilterChange: setFiltering
  });

  useEffect(() => {
    if(classes) class_value = classes;
  },[classes])

  useEffect(() => {
    if(className === "setMainCharacter") {
      return;
    }
    // sankey_checked[className] = {};
    // sankey_color[className] = {};
    edit_checked[className] = {};
    character_checked[className] = {};
    const newRowSelection = {};
    const _data = structuredClone(data);
    data.map((node) => initSelect.includes(node.id)).forEach((element, idx) => {
      if(element) {
        newRowSelection[idx] = true;
        character_checked[className][_data[idx].id] = true;
      }
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

        setParentDimensions({ width: clientWidth, height: clientHeight - inputHeight });
      }
    }
  }, []);

  function handleClassClick(class_value) {
    const cssWrapper = document.getElementById('CSSWrapper')
    cssWrapper.style.display = 'flex';
    setClasses({...class_value});
  }

  async function handleCharacterSelect(e) {
    const allChosenCharacter = Object.keys(character_checked[className]).filter(key => character_checked[className][key]);
    if(className === "setMainCharacter") {
      return;
    }
    if(className === "main") {
      characters[currentGraph] = allChosenCharacter.map(char => char.replaceAll("_", " "));
      const graph_list = await getListOfGraphs(data_name, [currentGraph], characters, mode);
      setGraphList((graphList) => {
        for(const graph of graphList) {
          if(!graph) continue;
          if(graph.range !== currentGraph) {
            continue;
          }
          graph.full_graph = graph_list[0];
        }
      })
      setCharacters({...characters});
      return;
    }
    characters[currentGraph] = allChosenCharacter.map(d => ({id: d}));
    setCharacters({...characters});
  }

  /**
     * Trigger the specified event on the specified element.
     * @param  {Object} elem  the target element.
     * @param  {String} event the type of the event (e.g. 'click').
     */
  function triggerEvent( elem, event ) {
    var clickEvent = new Event( event, { bubbles: true } ); // Create the event.
    elem.dispatchEvent( clickEvent );    // Dispatch the event.
  }

  function handleEditSelect(e) {
    let allChosenCharacter = [...new Set(getAllChosenCharacter(e, 'edit-select', className))];
    if(className === "main") {
      allChosenCharacter = allChosenCharacter.map(char => char.replaceAll(" ", "_"));
    } else {
      allChosenCharacter = allChosenCharacter.map(char => char.id);
    }
    for(const id of allChosenCharacter) {
      const node = document.getElementById(`GraphComic-${currentGraph}-${id}`);
      if(!node) continue;
      setTimeout(() => {
        triggerEvent(node, 'click');
      }, 0);
    }
  }

  function handleCharacterChange(e) {
    if(e.target.id === `character-select-${className}`) {
      handleCharacterSelect(e, 'character-select');
      return;
    }
    // if(e.target.id === "edit-select") {
    //   handleEditSelect(e);
    //   return;
    // }
  }

  function handleRowClick(e, row, rowId, nodeId) {
    if(className === "setMainCharacter") {
      setClickedRow(rowId === clickedRow ? null : rowId);
      onRowClick(nodeId);
      return;
    }
    if(className === "support") {
      edit_checked[className][row.original.id] = !edit_checked[className][row.original.id]; 
      chosenGraph = currentGraph;
      if(edit_checked[className][row.original.id]) {
        e.target.closest('tr').style["background-color"] = '#f0f0f0';
      } else {
        e.target.closest('tr').style["background-color"] = '#ffffff';
      }
      return;
    }
  }

  const Row = ({ row }) => {
    return (
      <tr
          onMouseEnter={(e) => {
            e.target.closest('tr').style["background-color"] = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            if(className === "setMainCharacter") {
              e.target.closest('tr').style["background-color"] = '#ffffff';
              return;
            }
            if(edit_checked[className][row.original.id]) {
              e.target.closest('tr').style["background-color"] = '#f0f0f0';
            } else {
              e.target.closest('tr').style["background-color"] = '#ffffff';
            }
          }}
          onClick={(e) => {
            handleRowClick(e, row, row.id, row.original.id);
          }} // Toggle the clicked state
          className={`${styles.row}`} // Call the onRowClick function with the node ID as an argument
        >
        {row.getVisibleCells().map((cell, idx) => (
          <td key={idx}>
            {cell.column.id === 'id' ? (
              row.original.id.replace(/_/g, " ") // Replace underscores with spaces
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
        </td>
        ))}
      </tr>
    );
  };

  return (
    <div ref={tableRef}>
      {attributes ? 
      <div className={styles.searchBar_select}>
      <select
          className={styles.select}
          id="attributeDropdown"
          value={selectedAttribute}
          onChange={(e) => setSelectedAttribute(e.target.value)}
        >
          {attributes.map((attribute) => (
            <option key={attribute} value={attribute} className={styles.option}>
              {attribute}
            </option>
          ))}
      </select>
      <input 
          ref={inputRef}
          type="text"
          value={filtering}
          onChange={(e) => setFiltering(e.target.value)}
          placeholder="Search node"
          className={styles.searchInput_select}
        />
    <RxMagnifyingGlass 
        className={styles.searchIcon} 
        style={{ 
            position: 'absolute', 
            top: '50%', 
            right: '10px',  // or adjust as needed
            transform: 'translateY(-50%)'
        }} 
    />
      </div>
      : (
      <div className={styles.searchBar}>
      <input
          ref={inputRef}
          type="text"
          value={filtering}
          onChange={(e) => setFiltering(e.target.value)}
          placeholder="Search node"
          className={styles.searchInput}
        />
        <RxMagnifyingGlass 
        className={styles.searchIcon} 
        style={{ 
            position: 'absolute', 
            top: '50%', 
            right: '10px',  // or adjust as needed
            transform: 'translateY(-50%)'
        }} 
      />
      </div>
      )}
    <div
      className={styles.tableContainer}
      style={{
        maxHeight: `${parentDimensions.height - 60}px`,
        maxWidth: `${parentDimensions.width}px`,
        overflow: 'auto'
      }}
    >
      <form id="main_character_form" onChange={handleCharacterChange}>
        <table className={styles.table}> 
          <thead>
            {table.getHeaderGroups().map((headerGroup, idx) => (
              <tr key={idx}>
                {headerGroup.headers.map((header, idxx) => (
                  <th 
                    key={idxx} 
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
          <tbody id={`filter-${className}`}>
            {table.getRowModel().rows.map((row, idx) => (
                <Row key={idx} row={row}/>
            ))}
          </tbody>
        </table>
      </form>
    </div>
    <div className="h-2" />
    
    <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    }}>
    <button 
        className={`${styles.page_button}`}
        onClick={() => {
            table.setPageIndex(0);
            setPageGroupStart(0);
        }}
        disabled={!table.getCanPreviousPage()}
    >
        <MdOutlineKeyboardDoubleArrowLeft />
    </button>
    <button
        className={`${styles.page_button}`}
        onClick={() => {
            let newStart = pageGroupStart - pageNum;
            if (newStart < 0) newStart = 0;
            setPageGroupStart(newStart);
            table.setPageIndex(newStart);
        }}
        disabled={pageGroupStart === 0}
    >
        <MdOutlineKeyboardArrowLeft />
    </button>

    {/* Page Numbers */}
    {Array.from({ length: pageNum }).map((_, idx) => {
        let pageNumber = pageGroupStart + idx;

        // Check if the page number exceeds total pages
        if (pageNumber >= table.getPageCount()) return null;

        return (
            <button className={`${styles.page_button}`}
                key={pageNumber}
                style={{
                   color: table.getState().pagination.pageIndex === pageNumber ? 'white' : '#304674',
                    backgroundColor: table.getState().pagination.pageIndex === pageNumber ? '#304674' : 'white'
                }}
                onClick={() => table.setPageIndex(pageNumber)}
            >
                {pageNumber + 1}
            </button>
        )
    })} 

    <button
        className={`${styles.page_button}`}
        onClick={() => {
            let newStart = pageGroupStart + pageNum;
            if (newStart >= table.getPageCount()) newStart = table.getPageCount() - pageNum;
            setPageGroupStart(newStart);
            table.setPageIndex(newStart);
        }}
        disabled={pageGroupStart + pageNum >= table.getPageCount()}
    >
        <MdOutlineKeyboardArrowRight />
    </button>
    <button
        className={`${styles.page_button}`}
        onClick={() => {
            const lastPageIndex = table.getPageCount() - 1;
            setPageGroupStart(lastPageIndex - (lastPageIndex % pageNum));
            table.setPageIndex(lastPageIndex);
        }}
        disabled={!table.getCanNextPage()}
    >
        <MdOutlineKeyboardDoubleArrowRight />
    </button>
    <select className={`${styles.page_select}`}
        value={table.getState().pagination.pageSize}
        onChange={e => {
            table.setPageSize(Number(e.target.value))
        }}
        style={{
            padding: '5px',
            borderRadius: '5px',
            marginLeft: '10px'
        }}
    >
        {[30, 40, 50, 75, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
                {pageSize}
            </option>
        ))}
    </select>
    </div>

      </div>
  );
});

export default Filter;