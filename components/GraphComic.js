import React, { memo, Suspense, use, useEffect, useRef, useState } from 'react';
import { IoColorPaletteOutline, IoText, IoImageOutline, IoChatbubbleOutline } from 'react-icons/io5';
import { RiDeleteBin5Line, RiFontSansSerif, RiFontSize2 } from 'react-icons/ri';
import { GiResize } from 'react-icons/gi';
import { AiOutlineHighlight, AiOutlineRobot} from 'react-icons/ai';
import { HiPlus, HiMinus, HiOutlineTrash } from 'react-icons/hi';
import { TbCircleDashed } from 'react-icons/tb';
import { BiBrush, BiExport, BiImport } from 'react-icons/bi';
import { LuLassoSelect } from 'react-icons/lu';
import { FcMindMap } from 'react-icons/fc';
import { FiZoomIn } from 'react-icons/fi';
import { MdOutlineLibraryAdd, MdFlipToFront, MdFlipToBack, MdOutlineFileUpload, MdArrowRightAlt, MdOutlineShapeLine, MdDone, MdFormatItalic, MdFormatBold, MdFormatUnderlined, MdLineWeight, MdOutlineFormatColorFill, MdOutlineBorderColor, MdOutlineFileDownload} from 'react-icons/md'
import { PiSelectionBackground } from "react-icons/pi";
import { FaBorderStyle } from "react-icons/fa";
import { getAllCombinedGraphs, getListOfGraphs, getDefaultMainCharacters, getChangeNeighboursAllNodes, getComm, getCategory, getSupporter, getSubRange } from '../api/graph';
import { BsBraces } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import styles from '../styles/Graphcomic.module.css'
import StaticGraph from './StaticGraph';
import { PixelDND, PercentDND } from './Draggable';
import { Frames } from './Frames';
import { generateLayout, useArrayState } from '../api/layout';
import { generateNarrativeForAll, improveNarrative } from '../api/narrative';
import { EMPTY_GRAPH } from '../constants';
import { computePositions } from './Position';
import Graph from './Graph';
import { filter, style } from 'd3';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getChosenTimeStamp } from './DendrogramChart';
import { graph } from 'neo4j-driver';
import { ImMakeGroup } from "react-icons/im";
import domtoimage from "dom-to-image";

let width, height;
let num_new_graphs = 0;

function usePrevious(value) {
	const ref = useRef();
	useEffect(() => {
	  ref.current = value;
	});
	return ref.current;
  }

function removeTooltip(){
    const tooltips = Array.from(document.getElementsByClassName(`${styles.tooltip}`))
    tooltips.map((tooltip) => {
		tooltip.style.display = 'none';
		if (tooltip.hasChildNodes()) {
			let children = Array.from(tooltip.childNodes);
			children.map((subtootlip) => {
				if(subtootlip.className && subtootlip.className.includes(`${styles.subtooltip}`)){
					subtootlip.style.display = 'none';
					// tooltip.removeChild(subtootlip);
				}
			});
		}
	})
  }

  function rgbToHex(rgb) {
    if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb; // Return the input if it's already a hex code.

    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgbMatch) return null; // Return null if the input isn't valid RGB.

    // Convert each RGB value to a hex string, pad with zeros if necessary, and concatenate.
    return "#" + rgbMatch.slice(1).map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

function changeBackground(focusedId) {
    const select = document.getElementById(focusedId);
    if (!select) return; // Exit if the element doesn't exist.

    // Normalize the current background color to a hex code for comparison.
    const currentBgColor = rgbToHex(window.getComputedStyle(select).backgroundColor);

    if (currentBgColor === '#ffffff') {
        select.style.backgroundColor = 'transparent';
    } else {
        select.style.backgroundColor = '#fff';
    }
}

function changeBorder(focusedId) {
    const select = document.getElementById(focusedId);
    if (!select) return; // Exit if the element doesn't exist.

    // Get computed style for the element.
    const computedStyle = window.getComputedStyle(select);

    // Check the border style specifically. If it's 'none' or effectively not displayed, set a new border.
    if (computedStyle.borderStyle === 'none' || computedStyle.borderWidth === '0px') {
        select.style.border = 'solid 0.1rem #888';
    } else {
        select.style.borderStyle = 'none';
    }
}

async function changeNarrative(data_name, focusedId) {
	const select = document.getElementById(focusedId);
    if (!select) return; // Exit if the element doesn't exist.
	const textField = select.getElementsByClassName(`${styles.text_input}`)[0];
	const oldNarrative = textField.innerText;
	const reader = await improveNarrative(data_name, oldNarrative);
	const decoder = new TextDecoder();
	let first = true;
	let improvedNarrative = "";
	reader.read().then(function processText({ done, value }) {
		if (done) {
		  // Do something with last chunk of data then exit reader
		  return;
		}
		if(first) {
			textField.innerText = '';
			first = false;
		}
		const decodedChunk = decoder.decode(value, { stream: true });
		decodedChunk.split('\n').map((line) => {
			line.trim();
			if(line.length == 0) return;
			const response = JSON.parse(line);
			const message = response.message;
			const content = message.content;
			improvedNarrative += content
			textField.innerText = improvedNarrative;
		});
  
		// Read some more, and call this function again
		return reader.read().then(processText);
	}).catch((err) => console.error(err));
}

function changeFontSize(event) {
	const tooltip = document.getElementById('TooltipNarration');
	const range = document.getElementById('Range');
	const input = document.getElementById('RangeInput');
	document.getElementById('InputValue').innerText = 2;

	if(range.style.display !== 'none'){
		Array.from(document.getElementsByClassName(`${styles.subtooltip}`)).map((item) => item.style.display = 'none')
	}else{
		Array.from(document.getElementsByClassName(`${styles.subtooltip}`)).map((item) => item.style.display = 'none') 
		input.min = 1;
		input.max = 7;
		input.step = 1;
		range.style.display = 'flex'
		range.style.position = 'absolute'
		range.style.left = `3rem`
		range.style.top = `calc(1rem + ${4 * 2.2}rem)`

		tooltip.appendChild(range);
	}

	range.oninput = (event) => {
		document.execCommand('fontSize', false, event.target.value);
		document.getElementById('InputValue').innerText = event.target.value
	}
}

function changeFontfamily(){
	const tooltip = document.getElementById('TooltipNarration');
	const select = document.getElementById('FontListWrapper');

	if(select.style.display !== 'none'){
		Array.from(document.getElementsByClassName(`${styles.subtooltip}`)).map((item) => item.style.display = 'none')
	}else{
		Array.from(document.getElementsByClassName(`${styles.subtooltip}`)).map((item) => item.style.display = 'none')

		select.style.display = 'flex'
		select.style.position = 'absolute'
		select.style.left = `3rem`
		select.style.top = `calc(1rem + ${3 * 2.2}rem)`

		tooltip.appendChild(select);
	} 

	select.onchange = () => {
		const font = document.getElementById('FontList')
		document.execCommand('fontName', false, font.value)
	}
}

function exportComics(){
	document.getElementById('Export').style.display = 'none';
	document.getElementById('ExportTypeSelect').style.display = 'flex';	
}

function exporting(setIsLoading, type){
	setIsLoading(true);
	const comics = document.getElementById('ComicCanvas');
	html2canvas(comics, {
		allowTaint : true,
		useCors : true,
	}).then(function (canvas) {
		const filename = `export.${type}`;
		const imgData = type === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg');

		if(type === 'pdf') {
			const imgWidth = 210;
			const pageHeight = imgWidth * 1.414; 
			const imgHeight = canvas.height * imgWidth / canvas.width;
			let heightLeft = imgHeight;
			const margin = 0;
		  
			const doc = new jsPDF('p', 'mm', 'a4');
			let position = 0;
		  
			// 첫 페이지 출력
			doc.addImage(imgData, 'jpeg', margin, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;
		  
			// 한 페이지 이상일 경우 루프 돌면서 출력
			while (heightLeft >= 20) {
			  position = heightLeft - imgHeight;
			  doc.addPage();
			  doc.addImage(imgData, 'jpeg', margin, position, imgWidth, imgHeight);
			  heightLeft -= pageHeight;
			}
		  
			// 파일 저장
			doc.save(filename);
		}
		else {
			const link = document.createElement('a');
			if (typeof link.download === 'string') {
				link.href = imgData;
				link.download = filename
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} else {
				window.open(uri);
			}
		}
		setIsLoading(false);

	}).catch(e => {
		setIsLoading(false)
	}); 
	document.getElementById('Export').style.display = 'inline-block';
	document.getElementById('ExportTypeSelect').style.display = 'none';	
}

const PhotoDND = ({	focusId,
					focusedCanvasIndex,
					setFocusedCanvasIndex,
					z_index,	}) => {
	const [image, setImage] = useState('');
	const buttonRef = useRef(null)
	const handleFileUpload = (e) => {
		if(e.target.files[0]) setImage(URL.createObjectURL(e.target.files[0]));
	}

	return(
		<PercentDND className={`${styles.graph} ${styles.image_wrapper}`}
					text_classname={`${styles.photo_move_handle}`}
					parent_size={{width: width, height: height}}
					prev_size={{width: 25, height: 25}}
					prev_position={{x:0, y:0}}
					focusId={focusId}
					focusedCanvasIndex={focusedCanvasIndex}
					onFocus={()=>{}}
					setFocusedCanvasIndex={setFocusedCanvasIndex}
					text_pannel={''}
					z_index={z_index}>
			<input ref={buttonRef} type='file' style={{display: 'none'}} onChange={handleFileUpload} />
			<img className={styles.image} src={image}  onClick={()=> {buttonRef.current.click();}}/>
			{ image == '' ? <div className={styles.preset_wrapper}>
				<button className={styles.preset_button} onClick={(e)=>{setImage('/icon/speech_bubble.png');}}><IoChatbubbleOutline/></button>
				<button className={styles.preset_button} onClick={(e)=>{setImage('/icon/arrow2.png'); }}><MdArrowRightAlt/></button>
				<button className={styles.preset_button} onClick={(e)=> {buttonRef.current.click(); }}><MdOutlineFileDownload/></button>
			</div> : null}
		</PercentDND>
	)
}
// onClick으로 변경하고, drag일 때 적용되게 
const NarrationDND = ({	focusId,
						textClass,
						focusedCanvasIndex,
						setFocusedCanvasIndex,
						size,
						defaultText,
						gutter,
						absoluteSize,
						absolutePos,
						z_index,
					}) => {
	const narRef = useRef(null);
	const canvasPos = document.getElementById("GraphComic").getBoundingClientRect();
	return (	
		<PercentDND className={`${styles.graph} ${styles.image_wrapper} ${textClass} ${absolutePos? absolutePos : ''}`}
					text_classname={`${styles.photo_move_handle}`}
					parent_size={{width: width, height: height}}
					prev_size={size ? {width: size.width, height: size.height} : {width: 25, height: 25}}
					prev_position={size? {x: size.x, y:size.y} : {x:0, y:0}}
					focusId={focusId}
					focusedCanvasIndex={focusedCanvasIndex}
					onFocus={(e)=>{
						const child = e.target.getElementsByClassName(`${styles.text_input}`)[0];
						if(child) child.focus()
					}}
					setFocusedCanvasIndex={setFocusedCanvasIndex}
					text_pannel={''}
					gutter={gutter}
					absoluteSize={absoluteSize}
					absolutePos={absolutePos}
					z_index={z_index}
		>
			<div ref={narRef} className={`${styles.text_input}`} style={{border:0, overflow: "auto", fontSize: focusId.includes("time") ?? '1rem'}} contentEditable='true' suppressContentEditableWarning={true}
				// onMouseDown={() => {
				// 	removeNarTooltip();
				// }}
				onDoubleClick={(e)=>{
					const selection = document.getSelection()
					if (selection.anchorOffset === selection.focusOffset) {
						// If the cursor is placed without any text selected, select all text in the contenteditable element
						const range = document.createRange();
						range.selectNodeContents(e.target);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				}}
				onFocus={(e)=>{
					const tooltips = Array.from(document.getElementsByClassName(`${styles.tooltip}`))
					tooltips.forEach((tooltip) => {
						if(tooltip.style.id !== 'TooltipNarration'){
							tooltip.style.display = 'none';
						}
					})
				
					const tooltip = document.getElementById('TooltipNarration');
					tooltip.style.display = 'flex';
					tooltip.style.position = 'absolute';
					tooltip.style.left = `${canvasPos.right}px`;
					tooltip.style.top = `${canvasPos.top}px`;
				}}
			>{defaultText ? defaultText : 'text'}</div>
		</PercentDND>
	);
  };

const GraphComic =	({	data_name,
						data,
						colorData,
						setData,
						childCluster,
						className,
						mode,
						character,
						mainCharacter,
						supporter,
						setSupporter,
						highlight,
						setHighlight,
						thumbnails,
						setMainCharacter,
						setCurrentSupporter,
						setThumbnails,
						currentGraphId,
						setCurrentGraphId,
						replacedGraph,
						setReplacedGraph,
						addedGraph,
						setAddedGraph,
						supportCandidate,
						setSupportCandidate,
						clusters,
						classes,
						linkClasses,
						setLinkClasses,
						selectedTime,
						threshold,
						color,
						allNodes,
						sankeyMode,
						graphList,
						setGraphList,
						freshGenerate,
						isLoading,
						setIsLoading,
					}) => {
	const parentRef = useRef(null);
	const [focusedCanvasIndex, setFocusedCanvasIndex] = useState(null);
	// const [graphList, setGraphList, graphListChangeCount] = useArrayState([]); 
	const [canvasList, setCanvasList] = useArrayState([]);
	const [isBrush, setIsBrush] = useState(false);
	const [initialPos, setInitialPos] = useState({});
	const [posState, setPosState] = useState("basic");

	const frameCount = useRef(0);

	const graphListSignificantChange = useRef(0);
	const prevGraphListSignificantChange = useRef(0);

	const nodeSet = new Set();
	graphList.forEach((graph, index) => {
		graph.full_graph.nodes.forEach(node => nodeSet.add(node));
	});
	allNodes.current = Array.from(nodeSet);

	// useEffect(() => {
	// 	const fetchDataAndUpdate = async () => {
	// 		if (data === null || data.length == 0) return;
	// 		const mains = await getDefaultMainCharacters(data_name, data, character, mode);
	// 		setMainCharacter(mains);
	// 	}
	// 	fetchDataAndUpdate();
	// }, [data]);

	useEffect(() => {
		if(graphListSignificantChange.current !== prevGraphListSignificantChange.current) {
			prevGraphListSignificantChange.current = graphListSignificantChange.current;
			return;
		}
		if(!graphList || graphList.length == 0) return;
		for(const graph of graphList){
			if(!graph) continue;
			const graph_range = graph.range.split("-");
			const range = graph_range.length > 1 ? `${graph_range[0]}-${graph_range[graph_range.length - 1]}` : graph_range[0];
			const support = getSupporter(graph.full_graph.links, mainCharacter[range], threshold["supporter"]);
			const highlighter = getSupporter(graph.full_graph.links, mainCharacter[range], threshold["highlighter"]);
			// supporter[parseInt(list_range[0])] = support;
			supporter[range] = support;
			highlight[range] = highlighter;
			setSupporter((supporter) => {
				supporter[range] = support;
			});
			setHighlight((highlight) => {
				highlight[range] = highlighter;
			});
		}
	}, [graphList, threshold]);

	useEffect(() => {
		const fetchDataAndUpdate = async () => {
			// const mains = mainCharacter;
			if (data === null || data.length == 0) {
				setIsLoading(false);
				return;
			}
			const mains = await getDefaultMainCharacters(data_name, data, character, mode);
			setMainCharacter(mains);
			if (!mains) {
				setIsLoading(false);
				return;
			};
			const graphs = await getListOfGraphs(data_name, data, mains, mode);
			const layout = buildLayout(graphs);
			let newCanvasList = [];
			const promises = graphs.map(async (graph, index) => {
				const list_range = data[index].split('-');
				const range = list_range.length > 1 ? `${list_range[0]}-${list_range[list_range.length - 1]}` : list_range[0];
				const hasSubrange = childCluster.hasOwnProperty(data[index]);
				const sub_range = hasSubrange ? childCluster[data[index]] : [list_range[0], list_range[list_range.length - 1]];
				const [from, to] = sub_range.map((d) => {
					const parse = d.split("-");
					return (parse.length > 1) ? `${parse[0]}-${parse[parse.length - 1]}` : parse[0];
				});
				// const graphAdd = await getChangeNeighboursAllNodes(mains[graph.time], from, to, "add", mode);
				// const graphDelete = await getChangeNeighboursAllNodes(mains[graph.time], from, to, "delete", mode);
				const graphAdd = await getChangeNeighboursAllNodes(data_name, mains[range], from, to, "add", mode);
				const graphDelete = await getChangeNeighboursAllNodes(data_name, mains[range], from, to, "delete", mode);
				const sub_from = from.split("-"); 
				const sub_to = to.split("-");
				const graphFrom = await getAllCombinedGraphs(data_name, mains[range], sub_from[0], sub_from[sub_from.length-1], "union", mode);
				const graphTo = await getAllCombinedGraphs(data_name, mains[range], sub_to[0], sub_to[sub_to.length-1], "union", mode);

				const row = layout.contents[index];
				const rowLength = layout.row_lengths[row.id];
				const size = {
					width : 100/rowLength, 
					height: 100/layout.row_lengths.length,
					x: width * row.position/rowLength,
					y: height * row.id/layout.row_lengths.length 
				}

				// // const support = getSupporter(graph.links, mains[graph.time], 2);
				// const support = getSupporter(graph.links, mains[range], threshold["supporter"]);
				// const highlighter = getSupporter(graph.links, mains[range], threshold["highlighter"]);
				// // supporter[parseInt(list_range[0])] = support;
				// supporter[range] = support;
				// highlight[range] = highlighter;
				// setSupporter({...supporter});
				// setHighlight({...highlight});

				// NARRATIVE
				const narrative = generateNarrativeForAll(mains[range], graph, graphAdd, graphDelete, graphFrom, graphTo);
				const id = 'canvas-' + `${index}`;
				const narrativeWidth =  width / rowLength / 2 - 10;
				const narrativeHeight = height / layout.row_lengths.length / 3;
				const narrativeSize = {
					width: 50,
					height: 33.33,
					x: narrativeWidth, //size.x + size.width/2/100*width,
					y: -narrativeHeight, //size.y + size.height*2/3/100*height
				}
				const child = 
					<NarrationDND 	key={id} 
									focusId={id}
									focusedCanvasIndex = {focusedCanvasIndex}
									setFocusedCanvasIndex={setFocusedCanvasIndex}
									size={narrativeSize}
									defaultText={narrative}
									gutter={1}
									absolutePos={"narrativePosition"}
					/>
				
				const canvasComponent = [child];
				newCanvasList.push(child);

				const measureTextSize = (text) => {
					const remToPixels = 16;
					const avgCharWidthRem = 0.8;
					const lineHeightRem = 1.5;
			
					const widthPx = text.includes("-") ? text.length * avgCharWidthRem * remToPixels :
									(text.length+1)* avgCharWidthRem * remToPixels;
					const heightPx = lineHeightRem * remToPixels;
					const lsize = { x: 0 + 10, y: - height / layout.row_lengths.length + heightPx, width: widthPx, height: heightPx};
					return lsize;
				  };

				const time_label = 
				<NarrationDND
					textClass={`${styles.time_label}`}
					key={`time-${index}`}
					focusId={`time-${index}`}
					focusedCanvasIndex = {focusedCanvasIndex}
					setFocusedCanvasIndex={setFocusedCanvasIndex}
					size={measureTextSize(range)}
					defaultText={range}
					absoluteSize={true}
					absolutePos={"timePosition"}
				/>
				
				canvasComponent.push(time_label);
				newCanvasList.push(time_label);

				return {
					index: index,
					full_graph: graph,
					add_graph: graphAdd,
					delete_graph: graphDelete,
					range: range,
					sub_range: [from, to],
					size: size,
					canvas: canvasComponent,
					color: colorData[index],
				};
			});
			const graphComics = await Promise.all(promises);
			// buildLayout(graphs);
			setGraphList(graphComics);
			// setCanvasList(newCanvasList);
			for(const graph of graphComics){
				const graph_range = graph.range.split("-");
				const range = graph_range.length > 1 ? `${graph_range[0]}-${graph_range[graph_range.length - 1]}` : graph_range[0];
				const support = getSupporter(graph.full_graph.links, mains[range], threshold["supporter"]);
				const highlighter = getSupporter(graph.full_graph.links, mains[range], threshold["highlighter"]);
				// supporter[parseInt(list_range[0])] = support;
				supporter[range] = support;
				highlight[range] = highlighter;
				setSupporter((supporter) => {
					supporter[range] = support;
				});
				setHighlight((highlight) => {
					highlight[range] = highlighter;
				});
			}
			setPosState("basic");
			setIsLoading(false);
		}
		fetchDataAndUpdate();
	}, [data]);

	useEffect(() => {
		if(!replacedGraph || replacedGraph.length == 0 ) {
			setIsLoading(false);
			return;
		}
		const currentGraph = graphList[focusedCanvasIndex];
		if(!currentGraph) {
			setIsLoading(false);
			return;
		}
		const timeKey = `time-${focusedCanvasIndex}`;
		const canvasKey = `canvas-${focusedCanvasIndex}`;
		const newCanvasList = canvasList.filter((canvas) => canvas.key !== canvasKey && canvas.key !== timeKey);

		const graphCanvas = replacedGraph.map((graph, index) => {
			const newSize = {
				width: currentGraph.size.width / replacedGraph.length,
				height: currentGraph.size.height,
				x: currentGraph.size.x + width * currentGraph.size.width / replacedGraph.length / 100 * index,
				y: currentGraph.size.y
			}
			
			const time = graph.graphData.time;
			const newMain = graph.mainCharacter;
			const support = getSupporter(graph.graphData.links, newMain, threshold["supporter"]);
			const highlighter = getSupporter(graph.graphData.links, newMain, threshold["highlighter"]);
			// supporter[parseInt(list_range[0])] = support;
			supporter[time] = support;
			highlight[time] = highlighter;
			mainCharacter[time] = newMain;
			setSupporter((supporter) => {
				supporter[time] = support;
			});
			setHighlight((highlight) => {
				highlight[time] = highlighter;
			});
			setMainCharacter({...mainCharacter});

			const measureTextSize = (text) => {
				const remToPixels = 16;
				const avgCharWidthRem = 0.8;
				const lineHeightRem = 1.5;
				const widthPx = text.includes("-") ? text.length * avgCharWidthRem * remToPixels :
								(text.length+1)* avgCharWidthRem * remToPixels;
				const heightPx = lineHeightRem * remToPixels;
				const lsize = { x: 0 + 10, y: - height * newSize.height / 100 + heightPx, width: widthPx, height: heightPx};
				return lsize;
			};
			
			// NARRATIVE
			const narrative = generateNarrativeForAll(mainCharacter[time], graph.graphData, EMPTY_GRAPH, EMPTY_GRAPH, graph.graphData, graph.graphData);
			const id = `canvas-repaced-${focusedCanvasIndex}-${index}`;
			const narrativeWidth =  width * newSize.width / 100 / 2 - 10;
			const narrativeHeight = height * newSize.height / 100 / 3;
			const narrativeSize = {
				width: 50,
				height: 33.33,
				x: narrativeWidth,
				y: -narrativeHeight
			}
			
			const child = 
				<NarrationDND 	
					key={id} 
					focusId={id}
					focusedCanvasIndex = {focusedCanvasIndex}
					setFocusedCanvasIndex={setFocusedCanvasIndex}
					size={narrativeSize}
					defaultText={narrative}
					gutter={1}
				/>

			const canvasComponent = [child];
				
			newCanvasList.push(child);
	
			const timeLabelSize = measureTextSize(time);
			const timeLabel = 
				<NarrationDND
					textClass={`${styles.time_label}`}
					key={`time-replaced-${focusedCanvasIndex}-${index}`}
					focusId={`time-replaced-${focusedCanvasIndex}-${index}`}
					focusedCanvasIndex={focusedCanvasIndex}
					setFocusedCanvasIndex={setFocusedCanvasIndex}
					size={timeLabelSize}
					defaultText={time}
					absoluteSize={true}
					absolutePos={"timePosition"}
				/>
			
			canvasComponent.push(timeLabel);
			newCanvasList.push(timeLabel);

			const graphData = {
				full_graph: graph.graphData,
				add_graph: {
					...EMPTY_GRAPH, 
					from: graph.graphData.from,
					to: graph.graphData.to,
				},
				delete_graph: {
					...EMPTY_GRAPH, 
					from: graph.graphData.from,
					to: graph.graphData.to,
				},
				size: newSize, 
				range: graph.graphData.time,
				canvas: canvasComponent,
				z_index: 2,
				reset_transform: true,
			}
			return {
				graphData: graphData,
			}
		});
		// setCanvasList(newCanvasList);
		// const newGraph = graphList.concat(graphCanvas.map((graph) => graph.graphData));
		// let updatedGraphList = newGraph.filter((_, index) => index !== focusedCanvasIndex);
		// updatedGraphList = updatedGraphList.map((graph, index) => {return {...graph, index: index}})
		setFocusedCanvasIndex(null);
		setGraphList((graphList) => {
			if(focusedCanvasIndex !== null) {
				delete graphList[focusedCanvasIndex];
			}
			const new_graphs = graphCanvas.map((graph, index) => ({...graph.graphData, index: focusedCanvasIndex + index}));
			graphList.push(...new_graphs);
		});
		setReplacedGraph([]);
		setIsLoading(false);
	}, [replacedGraph]);

	useEffect(() => {
		const fetchDataAndUpdate = async () => {
		
			if(!addedGraph || addedGraph.length == 0 ) {
				setIsLoading(false);
				return;
			}
			const timeNodes = new Array(addedGraph.length).fill(1);
			const layout = generateLayout(timeNodes);
			let currentGraph = graphList[focusedCanvasIndex];
			if(!currentGraph) {
				currentGraph = graphList[graphList.length - 1];
			}
			if(!currentGraph) {
				setIsLoading(false);
				return;
			}
			const num_graphs = graphList.length;
			const newCanvasList = [...canvasList];
			const promises = addedGraph.map(async (graph, index) => {
				const row = layout.contents[index];
				const rowLength = layout.row_lengths[row.id];
				const ratio = 1/4
				const partSize = {
					width: currentGraph.size.width * (1-ratio),
					height: currentGraph.size.height * (1-ratio),
					x: currentGraph.size.x + width * ratio * currentGraph.size.width / 100,
					y: currentGraph.size.y + height * ratio * currentGraph.size.height / 100
				}
				const newSize = {
					width : partSize.width / rowLength, 
					height: partSize.height / layout.row_lengths.length,
					x: partSize.x  + width * partSize.width * (row.position/rowLength) / 100,
					y: partSize.y + height * partSize.height  * (row.id/layout.row_lengths.length) / 100
				}
				const time = graph.graphData.time;
				const newMain = graph.mainCharacter;
				const support = getSupporter(graph.graphData.links, newMain, threshold["supporter"]);
				const highlighter = getSupporter(graph.graphData.links, newMain, threshold["highlighter"]);
				
				supporter[graph.graphData.range] = support;
				highlight[graph.graphData.range] = highlighter;
				mainCharacter[graph.graphData.range] = newMain.map(main => main.replaceAll("_", " "));
				setSupporter((supporter) => {
					supporter[time] = support;
				});
				setHighlight((highlight) => {
					highlight[time] = highlighter;
				});
				setMainCharacter({...mainCharacter});

				const measureTextSize = (text) => {
					const remToPixels = 16;
					const avgCharWidthRem = 0.8;
					const lineHeightRem = 1.5;
					const widthPx = text.includes("-") ? text.length * avgCharWidthRem * remToPixels :
									(text.length+1)* avgCharWidthRem * remToPixels;
					const heightPx = lineHeightRem * remToPixels;
					const lsize = { x: 0 + 10, y: -height * newSize.height / 100 + heightPx, width: widthPx, height: heightPx};
					return lsize;
				};
				
				const prefix = `time-added-${num_graphs + index}`
				const curLabels = canvasList.filter( canvas => canvas.key.includes(prefix))
											.map( canvas => parseInt(canvas.key.split('-')[3], 10));
				const constant = curLabels.length ? Math.max(...curLabels)+1 : 0; 
				const timeLabelText = (graph.graphData.from === graph.graphData.to)? time : `${graph.graphData.from}-${graph.graphData.to}`;
				const timeLabelSize = measureTextSize(timeLabelText);

				const canvasComponent = [];
				
				if(graph.graphData.from !== graph.graphData.to) {
					const {from, to} = await getSubRange(data_name, graph.graphData.from, graph.graphData.to, character, mode);
					const graphAdd = await getChangeNeighboursAllNodes(data_name, newMain, from, to, "add", mode);
					const graphDelete = await getChangeNeighboursAllNodes(data_name, newMain, from, to, "delete", mode);
					const sub_from = from.split("-"); 
					const sub_to = to.split("-");
					const graphFrom = await getAllCombinedGraphs(data_name, newMain, sub_from[0], sub_from[sub_from.length-1], "union", mode);
					const graphTo = await getAllCombinedGraphs(data_name, newMain, sub_to[0], sub_to[sub_to.length-1], "union", mode);
					// NARRATIVE
					const narrative = generateNarrativeForAll(newMain, graph.graphData, graphAdd, graphDelete, graphFrom, graphTo);
					const id = 'canvas-' + `${num_graphs + index}`;
					const narrativeWidth =  width / rowLength / 2 - 10;
					const narrativeHeight = height / layout.row_lengths.length / 3;
					const narrativeSize = {
						width: 50,
						height: 33.33,
						x: narrativeWidth, //size.x + size.width/2/100*width,
						y: -narrativeHeight, //size.y + size.height*2/3/100*height
					}
					const child = 
						<NarrationDND 	key={id} 
										focusId={id}
										focusedCanvasIndex = {focusedCanvasIndex}
										setFocusedCanvasIndex={setFocusedCanvasIndex}
										size={narrativeSize}
										defaultText={narrative}
										gutter={1}
										absolutePos={"narrativePosition"}
						/>
					
					canvasComponent.push(child);
					newCanvasList.push(child);

					graph.add_graph = graphAdd;
					graph.delete_graph = graphDelete;
				}

				const timeLabel = 
					<NarrationDND
						textClass={`${styles.time_label}`}
						key={`${prefix}`}
						focusId={`${prefix}`}
						focusedCanvasIndex={focusedCanvasIndex}
						setFocusedCanvasIndex={setFocusedCanvasIndex}
						size={timeLabelSize}
						defaultText={timeLabelText}
						absoluteSize={true}
						absolutePos={"timePosition"}
					/>
				
				canvasComponent.push(timeLabel);
				newCanvasList.push(timeLabel);


				const add_graph = graph.add_graph? graph.add_graph : EMPTY_GRAPH;
				const delete_graph = graph.delete_graph? graph.delete_graph : EMPTY_GRAPH;

				const graphData = { 
					full_graph: graph.graphData,
					add_graph: {
						...add_graph,
						from: graph.graphData.from,
						to: graph.graphData.to,
					},
					delete_graph: {
						...delete_graph,
						from: graph.graphData.from,
						to: graph.graphData.to,
					},
					size: newSize, 
					range: graph.graphData.range,
					canvas: canvasComponent,
					z_index: 2,
				}
				return {
					graphData: graphData,
				}
			});

			const graphCanvas = await Promise.all(promises);

			// setCanvasList(newCanvasList);
			// let updatedGraphList = graphList.concat(graphCanvas.map((graph) => graph.graphData));
			// updatedGraphList = updatedGraphList.map((graph, index) => {return {...graph, index: index}})
			setGraphList((graphList) => {
				const new_graphs = graphCanvas.map((graph) => graph.graphData);
				graphList.push(...new_graphs);
				for(let i = 0; i < graphList.length; i++) {
					const graph = graphList[i];
					if(!graph) continue;
					graph.index = i;
				}
			});
			setIsLoading(false);
		}
		fetchDataAndUpdate();
	}, [addedGraph]);

	useEffect(() => {
		if(!clusters) return;
		setGraphList(async (graphList) => {
			for(let graphEntry of graphList) {
				if(!graphEntry) continue;
				const { from, to } = graphEntry.full_graph;
				const filtered = clusters.filter(cluster => Number(cluster.time) >= Number(from) && Number(cluster.time) <= Number(to));
				const fetchedData = [];
				for(const c of filtered) {
					const data = await getComm(data_name, c.time, c.id, sankeyMode);
					const el = { ...c, data: data, color: c.color };
					fetchedData.push(el);
				}
				if(JSON.stringify(graphEntry.full_graph.clusters) === JSON.stringify(fetchedData)) continue;
				graphEntry.full_graph.clusters = fetchedData;
			}
			graphListSignificantChange.current += 1;
		  });
	  }, [clusters]);
	  

	useEffect(()=>{
		window.addEventListener('resize', handleWindowResize);
		return() => window.removeEventListener('resize', handleWindowResize)
	},[])

	useEffect( () => {
		if(parentRef.current){
			handleWindowResize()
		}
	}, [parentRef]);

	const addCanvas = (e) => {
		document.getElementById('CanvasAdd').style.display = 'none';
		document.getElementById('CanvasTypeSelect').style.display = 'flex';
	}
	
	const removeCanvas = (e) => {
		if (focusedCanvasIndex !== null) {
			graphListSignificantChange.current += 1;
			if(typeof(focusedCanvasIndex) == 'string'){
				setGraphList((graphList) => {
					let canvasId = -1;
					const idx = graphList.findIndex((graph, idx) => {
						if(!graph) return false;
						return graph.canvas.some((canvas, index) => {
							if(canvas.props.focusId === focusedCanvasIndex){
								canvasId = index;
								return true;
							}
						});
					});
					if(idx === -1) {
						const newCanvas = canvasList.filter((canvas) => canvas.key !== focusedCanvasIndex);
						// const targetIndex = Number(focusedCanvasIndex.split('-')[1])
						// const newCanvas = canvasList.map((canvas, index) => { return index === targetIndex ? null : canvas})
						setCanvasList(newCanvas);
					} else {
						graphList[idx].canvas.splice(canvasId, 1);
					}
				});
			}
			else {
				const deleted_index = graphList.findIndex((graph) => graph? graph.index === focusedCanvasIndex : false);
				if(deleted_index === -1) {
					return;
				}
				setGraphList((graphList) => {
					delete graphList[deleted_index];
				});

				const newCanvas = canvasList.filter((canvas) => !(
					canvas.key === `time-${focusedCanvasIndex}` ||
					canvas.key === `time-added-${focusedCanvasIndex}` ||
					canvas.key === `time-replaced-${focusedCanvasIndex}` ||

					canvas.key === `canvas-${focusedCanvasIndex}` ||
					canvas.key === `canvas-added-${focusedCanvasIndex}` ||
					canvas.key === `canvas-replaced-${focusedCanvasIndex}` 
				));

				setCanvasList(newCanvas)
			}
			setFocusedCanvasIndex(null);
		}
	};

	const moveFrontBack = (e, isMoveFront) => {
		if (focusedCanvasIndex !== null) {
			graphListSignificantChange.current += 1;
			if(typeof(focusedCanvasIndex) == 'string'){
				setGraphList((graphList) => {
					let canvasId = -1;
					const idx = graphList.findIndex((graph, idx) => {
						if(!graph) return false;
						return graph.canvas.some((canvas, index) => {
							if(canvas.props.focusId === focusedCanvasIndex){
								canvasId = index;
								return true;
							}
						});
					});
					if(idx === -1) {
						setCanvasList((canvasList) => {
							const change_index = canvasList.findIndex((canvas) => canvas.key === focusedCanvasIndex);
							if(change_index === -1) return;
							canvasList[change_index] = {
								...canvasList[change_index],
								props: {
									...canvasList[change_index].props,
									z_index: isMoveFront? 2 : 0
								}
							};
						});
					} else {
						graphList[idx].canvas[canvasId] = {
							...graphList[idx].canvas[canvasId],
							props: {
								...graphList[idx].canvas[canvasId].props,
								z_index: isMoveFront? 2 : 0
							}
						};
					}
				});
			}
			else {
				const selected_index = graphList.findIndex((graph) => graph? graph.index === focusedCanvasIndex : false);
				if(selected_index === -1) {
					return;
				}
				setGraphList((graphList) => {
					graphList[selected_index].z_index = isMoveFront? 2 : 0;
				});
			}
		}
	}

	const moveToFront = (e) => {
		moveFrontBack(e, true);
	};

	const moveToBack = (e) => {
		moveFrontBack(e, false);
	};

	const selectPosition = (e) => {
		document.getElementById('Fixed').style.display = 'none';
		document.getElementById('PosSelect').style.display = 'flex';
	}

	const selectPosType = (e) => {
		let combinedGraph = {
			nodes: [],
			links: []
		};
		if(e.target.innerHTML === 'Fixed') {
			getPosition(e);
		} else if(e.target.innerHTML === 'Filled') {
			setPosState("fill");
			setInitialPos(computePositions(combinedGraph));
		} else {
			setPosState("basic");
			setInitialPos(computePositions(combinedGraph));
		}
		document.getElementById('Fixed').style.display = 'inline-block';
		document.getElementById('PosSelect').style.display = 'none';
	}

	const getPosition = (e) => {
		let combinedGraph = {
			nodes: [],
			links: []
		};
		// if(posSelect) {
		// 	setPosSelect(false);
		// 	return setInitialPos(computePositions(combinedGraph));
		// }
		setPosState("fix");
		const thisData = graphList.map((graph) => graph.full_graph);
		let linkSet = new Set();
		let allLinks = [];

		thisData.forEach(dict => {
			// Add nodes if they don't already exist
			dict.nodes.forEach(node => {
				if (!combinedGraph.nodes.some(n => n === node)) {
					combinedGraph.nodes.push(node);
				}
			});

			// Add links if they don't already exist
			dict.links.forEach(link => {
				const source = link.source;
				const target = link.target;
				const value = link.value;

				if (linkSet.has(`${source},${target}`) || linkSet.has(`${target},${source}`)) {
					for (const existingLink of allLinks) {
						if ((existingLink.source === source && existingLink.target === target) ||
							(existingLink.source === target && existingLink.target === source)) {
							existingLink.value += value;
							break;
						}
					}
				} else {
					linkSet.add(`${source},${target}`);
					combinedGraph.links.push({ ...link });
				}
			});
		});

		setInitialPos(computePositions(combinedGraph));
	};

	const selectCanvasType = async (e) => {

		document.getElementById('CanvasAdd').style.display = 'inline-block';
		document.getElementById('CanvasTypeSelect').style.display = 'none';

		if(e.target.innerHTML === 'Graph') {
			setIsLoading(true);
			// const chosen_time = getChosenTimeStamp();
			if(selectedTime === null) {
				setIsLoading(false);
				return;
			}
			const chosen_time = selectedTime.split('-');
			// if(chosen_time === null || chosen_time.style.fill === "white") return
			// const new_time = parseInt(chosen_time.getAttribute("value"));
			const range = selectedTime.split("-");
			const from = range[0];
			const to = range[range.length - 1];

			const mains = await getDefaultMainCharacters(data_name, [selectedTime], character, mode);
			if (!mains) {
				setIsLoading(false);
				return;
			}
			const graph = (await getListOfGraphs(data_name, [selectedTime], mains, mode))[0];
			const mainCharacter = Object.values(mains)[0];
			// const graphAdd = await getChangeNeighboursAllNodes(data_name, mainCharacter, from, to, "add", mode);
			// const graphDelete = await getChangeNeighboursAllNodes(data_name, mainCharacter, from, to, "delete", mode);
			const categories = await getCategory(data_name, graph.from, graph.to, "");
			const key = `${graph.from}-${graph.to}_new`;
			setAddedGraph([{
				graphData: {
					...graph,
					categories,
					range: `${graph.from}-${graph.to}`,
				},
				add_graph: EMPTY_GRAPH,
				delete_graph: EMPTY_GRAPH,
				mainCharacter: mainCharacter,
				key: key,
				z_index: 2,
			}]);
			setIsLoading(false);
			return;
		}

		if(e.target.innerHTML === "Background") {
			if(focusedCanvasIndex === null) {
				return;
			}
			if(typeof(focusedCanvasIndex) == 'string') {
				return;
			}
			if(focusedCanvasIndex >= graphList.length) {
				return;
			}

			const frame = document.getElementById(`${focusedCanvasIndex}`);
			const svg = frame.querySelector("svg");
			const canvas = svg.querySelector("g");
			const handleFileUpload = (e) => {
				var reader = new FileReader();
				if(!e.target.files[0]) {
					return;
				}
				reader.readAsDataURL(e.target.files[0]);
				reader.onload = function () {
					const base64 = reader.result;
					setGraphList((graphList) => {
						const graph = graphList[focusedCanvasIndex];
						if(!graph) return;
						graph.background = base64;
					});
				};
				reader.onerror = function (error) {
				  console.log('Error: ', error);
				};
			}
			const input = document.createElement('input');
			input.setAttribute("type", "file");
			input.style.display = "none";
			input.addEventListener("change", handleFileUpload);
			input.click();
			return;
		}

		const id = e.target.innerHTML + '-' + `${canvasList.length}`;
		const child = (e.target.innerHTML === 'Image') ? 
			<PhotoDND	key={id} 
						focusId={id}
						focusedCanvasIndex = {focusedCanvasIndex}
						setFocusedCanvasIndex={setFocusedCanvasIndex}
						z_index={2}/>
		:
			<NarrationDND 	key={id} 
							focusId={id}
							focusedCanvasIndex = {focusedCanvasIndex}
							setFocusedCanvasIndex={setFocusedCanvasIndex}
							z_index={2}/>
		
		setCanvasList([...canvasList, child])
	}

	const handleWindowResize = (e) => {
		const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
		const remToPx = value => value * rootFontSize;

		height = (window.innerHeight - remToPx(2.5))
		width = (window.innerWidth - remToPx(2.2)) * 0.5 // graph Comic 전체 layout의 flex 비율에 따라 조정

		const canvas = document.getElementById('ComicCanvas');
		canvas.style.height = `${height}px`;
		canvas.style.width = `${width}px`;
	}

	const buildLayout = (graphList) => {
		if(graphList.length === 0) {
			return;
		}

		const numNodes = [];

		const timeNodes = [];
		const totalTime = Math.max(...graphList.map(graph => Number(graph.to))) 
							- Math.min(...graphList.map(graph => Number(graph.from))) + 1;
		const totalNode = graphList.map(graph => graph.nodes ? graph.nodes.length : 0).reduce((a, b) => a + b, 0);

		graphList.forEach((graph, index) => {
			const allNodesNum = graph.nodes ? graph.nodes.length : 0;
			const timeStamp = Number(graph.to) - Number(graph.from) + 1;
			const timeWeight =  timeStamp / totalTime;
			const nodeWeight = allNodesNum / totalNode;
			numNodes.push(allNodesNum);
			timeNodes.push(graph.timepoints);
		});
		
		return generateLayout(timeNodes);
	};


	return <div id='GraphComic' className={className} ref={parentRef} >
	<div className='title'>Graph Comic
		<div className={styles.button_wrapper}>
			<button id='Export' className={styles.canvas_button} onClick={exportComics}><BiExport style={{fontSize: '0.8rem'}}/></button>
			<div id='ExportTypeSelect' className={styles.button_wrapper} style={{display: 'none'}}>
				<button className={styles.canvas_button} onClick={()=>exporting(setIsLoading, 'png')}>PNG</button>
				<button className={styles.canvas_button} onClick={()=>exporting(setIsLoading, 'jpeg')}>JPG</button>
				<button className={styles.canvas_button} onClick={()=>exporting(setIsLoading, 'pdf')}>PDF</button>
			</div>
			<button id='CanvasMode' className={styles.canvas_button} onClick={()=>{setIsBrush(!isBrush)}}>{isBrush ? <FiZoomIn style={{fontSize: '0.8rem'}}/> : <LuLassoSelect style={{fontSize: '0.8rem'}}/>}</button>
			<button id='CanvasMode' className={styles.canvas_button} onClick={moveToFront}><MdFlipToFront style={{fontSize: '0.8rem'}}/></button>
			<button id='CanvasMode' className={styles.canvas_button} onClick={moveToBack}><MdFlipToBack style={{fontSize: '0.8rem'}}/></button>
			<button id='CanvasAdd' className={styles.canvas_button} onClick={addCanvas}><MdOutlineLibraryAdd style={{fontSize: '0.8rem'}}/></button>
			<div id='CanvasTypeSelect' className={styles.button_wrapper} style={{display: 'none'}}>
				<button className={styles.canvas_button} onClick={selectCanvasType}>Background</button>
				<button className={styles.canvas_button} onClick={selectCanvasType}>Image</button>
				<button className={styles.canvas_button} onClick={selectCanvasType}>Text</button>
				<button className={styles.canvas_button} onClick={selectCanvasType}>Graph</button>
			</div>
			<button id='CanvasRemove' className={styles.canvas_button} onClick={removeCanvas}><HiOutlineTrash style={{fontSize: '0.8rem'}}/></button>
			<button id='Fixed' className={styles.canvas_button} onClick={selectPosition}><FcMindMap style={{fontSize: '0.8rem'}}/></button>
			<div id='PosSelect' className={styles.button_wrapper} style={{display: 'none'}}>
				<button className={styles.canvas_button} onClick={selectPosType}>Basic</button>
				<button className={styles.canvas_button} onClick={selectPosType}>Filled</button>
				<button className={styles.canvas_button} onClick={selectPosType}>Fixed</button>
			</div>
		</div>
	</div>
	<Frames 
		width={width}
		height={height}
		data_name={data_name} 
		graphList={graphList}
		setGraphList={setGraphList}
		focusedCanvasIndex={focusedCanvasIndex}
		setFocusedCanvasIndex={setFocusedCanvasIndex}
		setCurrentGraphId={setCurrentGraphId}
		mode={mode}
		mainCharacter={mainCharacter}
		thumbnails={thumbnails}
		setThumbnails={setThumbnails}
		isBrush={isBrush}
		supporter={supporter}
		highlight={highlight}
		supportCandidate={supportCandidate}
		setSupportCandidate={setSupportCandidate}
		setCurrentSupporter={setCurrentSupporter}
		initialPos={initialPos}
		classes={classes}
		linkClasses={linkClasses}
		setLinkClasses={setLinkClasses}
		posState={posState}
		setPosState={setPosState}
		color={color}
		canvasList={canvasList}
		setSupporter={setSupporter}
		setHighlight={setHighlight}
		threshold={threshold}
		freshGenerate={freshGenerate}
	/>
	<div id="TooltipInfo" className={styles.tooltip} />
	<PixelDND id="TooltipNode" className={styles.tooltip} >
		<button className={`${styles.tooltip_button} ${styles.close_button}`} aria-label="Close">X</button>
		<button className={styles.tooltip_button}><RiDeleteBin5Line className={styles.tooltip_icon}/>delete</button>
		<button className={styles.tooltip_button}><MdOutlineFormatColorFill className={styles.tooltip_icon}/>color</button>
		<button className={styles.tooltip_button}><GiResize className={styles.tooltip_icon}/>size</button>
		<button className={styles.tooltip_button}><MdOutlineBorderColor className={styles.tooltip_icon}/>STcolor</button>
		<button className={styles.tooltip_button}><MdLineWeight className={styles.tooltip_icon}/>stroke</button>
		<button className={styles.tooltip_button}><AiOutlineHighlight className={styles.tooltip_icon}/>highlight</button>
		<button className={styles.tooltip_button}><TbCircleDashed className={styles.tooltip_icon}/>opacity</button>
		<button className={styles.tooltip_button}><IoText className={styles.tooltip_icon}/>label</button>
		<button className={styles.tooltip_button}><IoImageOutline className={styles.tooltip_icon}/>image</button>
		<button className={styles.tooltip_button}><RiFontSize2 className={styles.tooltip_icon}/>Lsize</button>
		<button className={styles.tooltip_button}><ImMakeGroup className={styles.tooltip_icon}/>cluster</button>
		<input id='ThumbnailButton' type='file' style={{display:'none'}}/>
	</PixelDND>
	   <PixelDND id="TooltipLink" className={styles.tooltip}>
	    <button className={`${styles.tooltip_button} ${styles.close_button}`} aria-label="Close">X</button>
		<button className={styles.tooltip_button}><RiDeleteBin5Line className={styles.tooltip_icon}/>delete</button>
		<button className={styles.tooltip_button}><IoColorPaletteOutline className={styles.tooltip_icon}/>color</button>
		<button className={styles.tooltip_button}><MdLineWeight className={styles.tooltip_icon}/>thickness</button>
		<button className={styles.tooltip_button}><AiOutlineHighlight className={styles.tooltip_icon}/>highlight</button>
		<button className={styles.tooltip_button}><TbCircleDashed className={styles.tooltip_icon}/>opacity</button>
			<button className={styles.tooltip_button}><BsBraces className={styles.tooltip_icon}/>class</button>
		<button className={styles.tooltip_button}><MdOutlineShapeLine className={styles.tooltip_icon}/>marker</button>
	</PixelDND>
	<PixelDND id="TooltipAll" className={styles.tooltip}>
		<button className={`${styles.tooltip_button} ${styles.close_button}`} aria-label="Close">X</button>
		<button className={styles.tooltip_button}><RiDeleteBin5Line className={styles.tooltip_icon}/>delete</button>
		<button className={styles.tooltip_button}><IoColorPaletteOutline className={styles.tooltip_icon}/>color</button>
		<button className={styles.tooltip_button}><AiOutlineHighlight className={styles.tooltip_icon}/>highlight</button>
		<button className={styles.tooltip_button}><TbCircleDashed className={styles.tooltip_icon}/>opacity</button>
	</PixelDND>
	<PixelDND id="TooltipCluster" className={styles.tooltip}>
		<button className={`${styles.tooltip_button} ${styles.close_button}`} aria-label="Close">X</button>
		<button className={styles.tooltip_button}><RiDeleteBin5Line className={styles.tooltip_icon}/>delete</button>
		<button className={styles.tooltip_button}><IoColorPaletteOutline className={styles.tooltip_icon}/>BGcolor</button>
		<button className={styles.tooltip_button}><TbCircleDashed className={styles.tooltip_icon}/>opacity</button>
	</PixelDND>
	<PixelDND id="TooltipNarration" className={styles.tooltip}>
		<button className={`${styles.tooltip_button} ${styles.close_button}`} onClick={removeTooltip} aria-label="Close">X</button>
		<button className={styles.tooltip_button} onClick={()=>{document.execCommand('bold');}}><MdFormatBold className={styles.tooltip_icon}/>bold</button>
		<button className={styles.tooltip_button} onClick={() => {document.execCommand('italic');}}><MdFormatItalic className={styles.tooltip_icon}/>italic</button>
		<button className={styles.tooltip_button} onClick={() => {document.execCommand('underline');}}><MdFormatUnderlined className={styles.tooltip_icon}/>line</button>
		<button className={styles.tooltip_button} onClick={changeFontfamily}><RiFontSansSerif className={styles.tooltip_icon}/>font</button>
		<button className={styles.tooltip_button} onClick={changeFontSize}><RiFontSize2 className={styles.tooltip_icon}/>size</button>
		<button className={styles.tooltip_button} onClick={()=>changeBackground(focusedCanvasIndex)}><PiSelectionBackground className={styles.tooltip_icon}/>BG</button>
		<button className={styles.tooltip_button} onClick={()=>changeBorder(focusedCanvasIndex)}><FaBorderStyle className={styles.tooltip_icon}/>border</button>
		<button className={styles.tooltip_button} onClick={()=>changeNarrative(data_name, focusedCanvasIndex)}><AiOutlineRobot className={styles.tooltip_icon}/>rewrite</button>
	</PixelDND>
	<div id='fontfamily' className={styles.subtooltip}>
	</div>
	<div id='Range' className={styles.subtooltip}>
		<input id='RangeInput' className={styles.range} type='range' min={1} max={10} step={1}/>
		<p id='InputValue' className={styles.ragne_value}></p>
	</div>
	<div id='Markers' className={styles.subtooltip}>
		<button className={styles.subtooltip_button}>No</button>
		<button className={styles.subtooltip_button} style={{fontSize: "0.45rem"}}>▶︎</button>
		<button className={styles.subtooltip_button} style={{fontSize: "0.4rem"}}>◣</button>
		<button className={styles.subtooltip_button}>◗</button>
	</div>
	<div id='HighlightType' className={styles.subtooltip}>
		<button className={styles.subtooltip_button}>No</button>
		<button className={styles.subtooltip_button}>dash</button>
		<button className={styles.subtooltip_button}>color</button>
	</div>
	<div id='Label' className={styles.subtooltip}>
		<input id='LabelInput' className={styles.label} type='text'/>
		<button id='LabelButton' className={styles.label_button}><MdDone size={'0.6rem'}/></button>
	</div>
	<div id='FontListWrapper' className={styles.subtooltip}>
		<select id='FontList' className={styles.fontlist}>
			<option value='Arial'>Arial</option>
			<option value='Courier New'>Courier New</option>
			<option value='Georgia'>Georgia</option>
			<option value='Times New Roman'>Times New Roman</option>
			<option value='Gill Sans'>Gill Sans</option>
			<option value='sans-serif'>Sans-serif</option>
			<option value='Helvetica'>Helvetica</option>
			<option value='Calibri'>Calibri</option>
			<option value='Roboto'>Roboto</option>
			<option value='Caveat'>Caveat</option>
			<option value='Chewy'>Chewy</option>
			<option value='Courgette'>Courgette</option>
			<option value='Gloria Hallelujah'>Gloria Hallelujah</option>
			<option value='Permanent Marker'>Permanent Marker</option>
			<option value='Poor Story'>Poor Story</option>
			<option value='Varela Round'>Varela Round</option>
			<option value='Segoe UI'>Segoe UI</option>
			<option value='Tahoma'>Tahoma</option>
		</select>
	</div>
</div>
};


export default GraphComic;