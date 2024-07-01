import React, { Suspense, use, useEffect, useRef, useState } from 'react';
import { IoColorPaletteOutline, IoText, IoImageOutline } from 'react-icons/io5'
import { RiDeleteBin5Line } from 'react-icons/ri'
import { GiResize } from 'react-icons/gi'
import { AiOutlineHighlight } from 'react-icons/ai'
import { TbCircleDashed } from 'react-icons/tb'
import { MdOutlineGroupWork, MdOutlineShapeLine, MdDone } from 'react-icons/md'
import { getChangeNeighbours, getCombineGraph, getGraph, getMainCharacters, getNeighbours, getListOfGraphs, getSubgraphs, getDefaultMainCharacters, getChangeNeighboursAllNodes, getComm } from '../api/graph';
import styles from '../styles/Graphcomic.module.css'
import StaticGraph from './StaticGraph';
import { PixelDND, PercentDND } from './Draggable';
import { generateLayout } from '../api/layout';
import { EMPTY_GRAPH } from '../constants';
import { computePositions } from './Position';
import Graph from './Graph';

let width, height;

const PhotoDND = ({	focusId,
					focusedCanvasIndex,
					setFocusedCanvasIndex	}) => {
	const [image, setImage] = useState('/icon/empty_image.svg');
	const buttonRef = useRef(null)

	const handleFileUpload = (e) => {
		if(e.target.files[0]) setImage(URL.createObjectURL(e.target.files[0]));
	}
	return(
		<PercentDND
			className={`${styles.graph} ${styles.image_wrapper}`}
			text_classname={`${styles.photo_move_handle}`}
			parent_size={{width: width, height: height}}
			prev_size={{width: 25, height: 25}}
			prev_position={{x:0, y:0}}
			focusId={focusId}
			focusedCanvasIndex={focusedCanvasIndex}
			onFocus={()=>{}}
			setFocusedCanvasIndex={setFocusedCanvasIndex}
			text_pannel={''}
		>
			<input ref={buttonRef} type='file' style={{display: 'none'}} onChange={handleFileUpload} />
			<img className={styles.image} src={image} onClick={()=> {buttonRef.current.click();}}/>
		</PercentDND>
	)
}

const NarrationDND = ({	focusId,
						focusedCanvasIndex,
						setFocusedCanvasIndex}) => {
	return (
		<PercentDND
			className={`${styles.graph} ${styles.image_wrapper}`}
			text_classname={`${styles.photo_move_handle}`}
			parent_size={{width: width, height: height}}
			prev_size={{width: 25, height: 25}}
			prev_position={{x:0, y:0}}
			focusId={focusId}
			focusedCanvasIndex={focusedCanvasIndex}
			onFocus={()=>{}}
			setFocusedCanvasIndex={setFocusedCanvasIndex}
			text_pannel={''}
		>
			<textarea className={styles.text_input} style={{border:0}} placeholder='text'/>
		</PercentDND>
)}

const GraphDND = ({ graph, 
					prev_size, 
					prev_range, 
					data_range, 
					sub_range, 
					data, 
					index, 
					focusId, 
					rowId, 
					mode,
					currentGraph, 
					setCurrentGraph, 
					mainCharacter, 
					mainCharacters, 
					thumbnails,
					setMainCharacter, 
					setCurrentGraphId, 
					setCurrentSupporter, 
					setThumbnails,
					isBrush, 
					focusedCanvasIndex, 
					supportCandidate,
					setSupportCandidate,
					setFocusedCanvasIndex,
					supporter,
					setSupporter,
					pos }) => {

	const [position, setPosition] = useState( (prev_size) ? 
		{ x: width * prev_size.width / 100 * index , y: (rowId === 0) ? 0 : height * prev_size.height / 100 * rowId} : 
		{x: 0, y: 0});
	const [size, setSize] = useState(prev_size ? prev_size : {width: 25, height:25});
	const [graphComic, setGraphComic] = useState({
		full_graph: EMPTY_GRAPH,
		add_graph: EMPTY_GRAPH,
		delete_graph: EMPTY_GRAPH,
	});
	const [currentSupportCandidate, setCurrentSupportCandidate] = useState([]);
	const [isFocusing, setIsFocusing] = useState(false);

	useEffect(() => {

		async function getData() {
			if(mainCharacter === undefined) return; 
			if(mainCharacter.length === 0) return;
			const range = data_range.split("-");
			const [from, to] = sub_range ? sub_range : [range[0], range[range.length - 1]];
			const graphAdd = await getChangeNeighboursAllNodes(mainCharacter, from, to, "add", mode);
			const graphDelete = await getChangeNeighboursAllNodes(mainCharacter, from, to, "delete", mode);
			graphComic.add_graph = graphAdd;
			graphComic.delete_graph = graphDelete;
			if(prev_size) {
				setPosition({ x: width * prev_size.width / 100 * index , y: height * prev_size.height / 100 * rowId});
				setSize(prev_size);
			}
			if(graph !== undefined) {
				graphComic.full_graph = graph
			}
			const nodeSums = {};
			for(let target of mainCharacter) {
				target = target.replaceAll(" ", "_");
				graph.links.forEach(link => {
					if (link.source === target) {
					if (!nodeSums[link.target]) nodeSums[link.target] = 0;
						nodeSums[link.target] += link.value;
					} else if (link.target === target) {
					if (!nodeSums[link.source]) nodeSums[link.source] = 0;
						nodeSums[link.source] += link.value;
					}
				});
			}
			const allNodes = Object.entries(nodeSums).map(([node, sum]) => ({id: node, num_links: sum}));
			allNodes.sort((a, b) => b.num_links - a.num_links);
			setCurrentSupportCandidate(allNodes);
			const filteredNodes = allNodes.filter(node => node.num_links > 1);
			supporter[parseInt(from)] = filteredNodes;
			setSupporter({...supporter});
			setGraphComic({...graphComic});
		}
		getData();
	}, [graph]);

	useEffect(() => {
		if(!isFocusing) return;
		supportCandidate[parseInt(data_range.split("-")[0])] = currentSupportCandidate;
		console.log("check first", parseInt(data_range.split("-")[0]));
		setSupportCandidate({...supportCandidate});
		console.log("candy", supportCandidate[parseInt(data_range.split("-")[0])], supportCandidate, currentSupportCandidate);
	}, [isFocusing, currentSupportCandidate]);

  return (
	<PercentDND
		className={`${styles.graph}`}
		parent_size={{width: width, height: height}}
		prev_size={size}
		prev_position={position}
		focusId={focusId}
		focusedCanvasIndex={focusedCanvasIndex}
		onFocus={async(e) => {
			if(Object.keys(graph).length === 0) return;
			const newGraph = await getGraph(data.split("-")[0]);
			if(currentGraph !== undefined && currentGraph.time === newGraph[0].time) {
				return;
			}
			setIsFocusing(true);
			setCurrentGraph(newGraph[0]);
			setCurrentGraphId(data);
			setCurrentSupporter(supporter[parseInt(data_range.split("-")[0])]);
			// setSupportCandidate(currentSupportCandidate);
		}}
		onBlur={(e) => {
			const parentElement = e.target.parentElement;
			const relatedTarget = e.relatedTarget;
			const isSibling = Array.from(parentElement.children).includes(relatedTarget);
			if(!isSibling) return;
			setIsFocusing(false);
		}}
		setFocusedCanvasIndex={setFocusedCanvasIndex}
		text_pannel={data_range}
	>
		<StaticGraph 	data={graphComic.full_graph}
						graphAdd={graphComic.add_graph}
						graphDelete={graphComic.delete_graph}
						mainCharacter={mainCharacter}
						supporter={supporter[parseInt(data_range.split("-")[0])]}
						mainCharacters={mainCharacters} 
						thumbnails={thumbnails}
						setMainCharacter={setMainCharacter} 
						setThumbnails={setThumbnails}
						isBrush={isBrush}
						cluster={graphComic.full_graph.clusters}
						where={"GraphComic"}
						position={pos}
		/>
    </PercentDND>
  );
};

const GraphComic = ({	data, 
						childCluster, 
						className, 
						currentGraph, 
						setCurrentGraph, 
						mode,
						character, 
						mainCharacter, 
						supporter,
						setSupporter,
						thumbnails,
						setMainCharacter, 
						currentSupporter,
						setCurrentSupporter, 
						setThumbnails,
						currentGraphId, 
						setCurrentGraphId,
						replacedGraph,
						supportCandidate,
						setSupportCandidate,
						clusters}) => {
	const parentRef = useRef(null);
	const [focusedCanvasIndex, setFocusedCanvasIndex] = useState(null);
	const [graphList, setGraphList] = useState([]); // curdata 중 graph 인 애들의 graph 정보 저장하는 것, graph 가 아닌 경우 비워져있음
	const [curData, setCurData] = useState(data); // canvases 정보 담고 잇음, graph 인 경우 ragne, 그 외는 해당하는 것 
	const [isBrush, setIsBrush] = useState(false);
	const [layoutBlueprint, setLayoutBlueprint] = useState(null);
	const [partitionedGraphDNDs, setPartitionedGraphDNDs] = useState([]);
	const [initialPos, setInitialPos] = useState({});
	const [posSelect, setPosSelect] = useState(false);
	// const [mainNode, setMainNode] = useState(mainCharacter? mainCharacter : {});

	// useEffect(() => {
	// 	setMainNode(mainCharacter);
	// }, [mainCharacter]);

	useEffect(() => {
		console.log("currentSupporter", currentSupporter);
		console.log("supporter", supporter);
	}, [currentSupporter]);

	useEffect(() => {
		if(replacedGraph.length === 0) return;
		const mainNode = {...mainCharacter};
		const mainCharacterDict = replacedGraph.reduce((acc, graph) => {
			acc[graph.graphData.time] = [graph.mainCharacter];
			return acc;
		  }, {});
		const cur = curData[focusedCanvasIndex].split("-")[0];
		delete mainNode[cur];
		Object.assign(mainNode, mainCharacterDict);
		setMainCharacter(mainNode);

		const newGraph = replacedGraph.map((graph) => {return graph.graphData});
		const newData = replacedGraph.map((graph) => {return graph.graphData.time});
		const newLength = replacedGraph.length;
		const newGraphList = [...graphList];
		newGraphList.splice(focusedCanvasIndex, 1, ...newGraph);
		const newCurData = [...curData];
		newCurData.splice(focusedCanvasIndex, 1, ...newData);
		const id = layoutBlueprint.contents[focusedCanvasIndex].id;

		const lastPosition = Math.max(...layoutBlueprint.contents.filter(item => item.id === id).map(item => item.position));
		const lastIdx = layoutBlueprint.contents.indexOf(layoutBlueprint.contents.find(item => item.id === id && item.position === lastPosition));

		// const lastIdx = layoutBlueprint.contents.lastIndexOf(layoutBlueprint.contents.find(item => item.id === id));
		// const lastPosition = layoutBlueprint.contents[lastIdx].position;
		const newItems = Array.from({ length: newLength - 1}, (_, i) => ({ id: id, position: lastPosition + 1 + i }));
		// console.log("new_items", newItems);
		const newBlueprint = {...layoutBlueprint};
		newBlueprint.contents = [
		...layoutBlueprint.contents.slice(0, lastIdx + 1), // items before and including idx
		...newItems, // new items
		...layoutBlueprint.contents.slice(lastIdx + 1) // items after idx
		];
		/*const lastPosition = Math.max(...layoutBlueprint.contents.filter(item => item.id === id).map(item => item.position));
		const newElements = Array.from({ length: newLength-1 }, (_, i) => ({ id: id, position: lastPosition + 1 + i }));
		const indexOfLast = data.findIndex(item => item.id === id && item.position === lastPosition);
		const newBlueprint = {...layoutBlueprint};
		newBlueprint.contents.splice(indexOfLast, 0, ...newElements);*/
		const count = newBlueprint.contents.filter(item => item.id === id).length;
		newBlueprint.row_lengths[id] = count;
		setGraphList(newGraphList);
		setCurData(newCurData);
		setLayoutBlueprint(newBlueprint);
	}, [replacedGraph]);

/*0	useEffect(() => {
		console.log('====================');
		console.log('graphList: ', graphList);
		console.log('curData: ', curData);
		console.log('mainCharacter: ', mainCharacter);
		console.log('layoutBlueprint: ', layoutBlueprint);
	}, [graphList, curData, layoutBlueprint]);*/

	const addCanvas = (e) => {
		document.getElementById('CanvasAdd').style.display = 'none';
		document.getElementById('CanvasTypeSelect').style.display = 'flex';
	}
	
	const removeCanvas = (e) => {
		if (focusedCanvasIndex !== null) {
			const newData = curData.filter((_, index) => index !== focusedCanvasIndex);
			const newGraph = graphList.filter((_, index) => index !== focusedCanvasIndex);
			setCurData(newData);
			setGraphList(newGraph);
			setFocusedCanvasIndex(null);
		}
	};

	const getPosition = (e) => {
		let combinedGraph = {
			nodes: [],
			links: []
		};
		if(posSelect) {
			setPosSelect(false);
			return setInitialPos(computePositions(combinedGraph));
		}
		setPosSelect(true);
		const thisData =[...graphList];
		console.log("thisDAta", thisData, graphList);
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

	const selectCanvasType = (e) => {
		const newData = curData ? [...curData, e.target.innerHTML] : [];
		const newGraph = graphList ? [...graphList, {}] : [{}];
		setCurData(newData);
		setGraphList(newGraph)
		document.getElementById('CanvasAdd').style.display = 'inline-block';
		document.getElementById('CanvasTypeSelect').style.display = 'none';
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

	useEffect(()=>{
		window.addEventListener('resize', handleWindowResize);
		return() => window.removeEventListener('resize', handleWindowResize)
	},[])

	useEffect( () => {
		if(parentRef.current){
			handleWindowResize()
		}
	}, [parentRef]);

	const buildLayout = (graphList) => {
		if(graphList.length === 0) {
			return;
		}

		const numNodes = [];

		graphList.forEach((graph, index) => {
			const allNodesNum = graph.nodes ? graph.nodes.length : 0;
			numNodes.push(allNodesNum);
		});

 
		setLayoutBlueprint(generateLayout(numNodes));
	};

	const returnCanvas = (item, index) => {
		if(item === 'image') {
			return <PhotoDND	key={index} 
								focusId={index}
								focusedCanvasIndex = {focusedCanvasIndex}
								setFocusedCanvasIndex={setFocusedCanvasIndex}/>
		}
		
		else if(item === 'narration') {
			return <NarrationDND 	key={index} 
									focusId={index}
									focusedCanvasIndex = {focusedCanvasIndex}
									setFocusedCanvasIndex={setFocusedCanvasIndex}/>
		}

		else { // graph
			let size, row, rowLength;
			if(Object.keys(graphList[index]).length > 0){
				row = layoutBlueprint.contents[index];
			 	rowLength = layoutBlueprint.row_lengths[row.id];
				size = {width : 100/rowLength, height: 100/layoutBlueprint.row_lengths.length}
			}


			const range = curData[index].split("-");
			let sub_range = null;
			if (childCluster.hasOwnProperty(curData[index])) { 
				sub_range = childCluster[curData[index]].map((d) => d.split("-"));
				sub_range = sub_range.map((d) => {
					return (d.length > 1)? d[0] + "-" + d[d.length - 1] : d[0]
				});
			}
			let prev_range = (index > 0)? curData[index - 1].split("-") : null;
			if(prev_range !== null) {
				prev_range = (prev_range.length > 1)? prev_range[0] + "-" + prev_range[prev_range.length - 1] : prev_range[0]
			}



			return <GraphDND 	graph={graphList[index]}
								key={index} 
								focusId={index} 
								prev_size={Object.keys(graphList[index]).length > 0 ? size : null}
								prev_range={prev_range}
								data_range={(range.length > 1)? range[0] + "-" + range[range.length - 1] : range[0]}
								sub_range={sub_range}
								data={item} 
								index={Object.keys(graphList[index]).length > 0 ? row.position : null} 
								currentGraph={currentGraph}
								setCurrentGraph={setCurrentGraph} 
								mode={mode}
								mainCharacter={mainCharacter[parseInt(range[0])]}
								mainCharacters={mainCharacter}
								thumbnails={thumbnails}
								setMainCharacter={setMainCharacter}
								setCurrentGraphId={setCurrentGraphId}
								setCurrentSupporter={setCurrentSupporter}
								setThumbnails={setThumbnails}
								rowId={Object.keys(graphList[index]).length > 0 ? row.id : null}
								isBrush={isBrush}
								focusedCanvasIndex={focusedCanvasIndex}
								setFocusedCanvasIndex={setFocusedCanvasIndex}
								supportCandidate={supportCandidate}
								setSupportCandidate={setSupportCandidate}
								supporter={supporter}
								setSupporter={setSupporter}
								pos={initialPos}
					/>
		}
	}

	useEffect(() => {
		const getMains = async() => {
			getDefaultMainCharacters(data, character, setMainCharacter);
		};
		getMains();
	}, [data]);

	useEffect( () => {
		if(replacedGraph.length > 0) return;
		if(data === null) return;
		// console.log("data", data);
		const range = data.map((d) => d.split("-"));
		const getList = async () => {
			const graphs = await getListOfGraphs(data, mainCharacter, mode);
			buildLayout(graphs);
			setGraphList(graphs);
		};
		getList();

		setCurData(range.map((d) => (d.length > 1) ? `${d[0]}-${d[d.length - 1]}` : d[0]));
	}, [mainCharacter]);

	useEffect(() => {
		const clustersList = graphList.map((graphEntry) => {
			const { from, to } = graphEntry;
			const filtered = clusters.filter(cluster => Number(cluster.time) >= Number(from) && Number(cluster.time) <= Number(to));
			const fetchedData = []
			filtered.map(async (c) => {
			  const data = await getComm(c.time, c.id);
			  const el = { ...c, data: data, color: c.color}
			  fetchedData.push(el);
			});
			return {
			  ...graphEntry,
			  clusters: fetchedData
			};
		});
		setGraphList(clustersList);
		/*console.log("filteredClustersList", clustersList);
		console.log("clusters", clusters);
		console.log("graphList", graphList);
		console.log("range", data);*/
	}, [clusters]);

	// useEffect(() => {
	// 	buildLayout();		
	// }, [graphList, curData, mainCharacter]);

	return <div id='GraphComic' className={className} ref={parentRef} >
		<div className='title'>GraphComic
			<div className={styles.button_wrapper}>
				<button id='CanvasMode' className={styles.canvas_button} onClick={()=>setIsBrush(!isBrush)}>{isBrush ? 'Zoom' : 'Brush'}</button>
				<button id='CanvasAdd' className={styles.canvas_button} onClick={addCanvas}>+</button>
				<div id='CanvasTypeSelect' className={styles.button_wrapper} style={{display: 'none'}}>
					<button className={styles.canvas_button} onClick={selectCanvasType}>image</button>
					<button className={styles.canvas_button} onClick={selectCanvasType}>narration</button>
					<button className={styles.canvas_button} onClick={selectCanvasType}>graph</button>
				</div>
				<button id='CanvasRemove' className={styles.canvas_button} onClick={removeCanvas}>-</button>
				<button id='Fixed' className={styles.canvas_button} onClick={getPosition}>@</button>
			</div>
		</div>
		<div className={styles.canvas} id='ComicCanvas'>
			{(curData && graphList && layoutBlueprint && Array.from(graphList).length == curData.length) ? curData.map((item, index) => returnCanvas(item, index)) : null}
		</div>
		<PixelDND className={styles.tooltip} id={"TooltipNode"} >
			<button className={styles.tooltip_button}><RiDeleteBin5Line />delete</button>
			<button className={styles.tooltip_button}><IoColorPaletteOutline/>color</button>
			<button className={styles.tooltip_button}><GiResize />size</button>
			<button className={styles.tooltip_button}><AiOutlineHighlight/>highlight</button>
			<button className={styles.tooltip_button}><TbCircleDashed/>opacity</button>
			<button className={styles.tooltip_button}><IoText/>label</button>
			<button className={styles.tooltip_button}><IoImageOutline/>image</button>
			<input id='ThumbnailButton' type='file' style={{display:'none'}}/>
		</PixelDND>
   		<PixelDND id="TooltipLink" className={styles.tooltip}>
			<button className={styles.tooltip_button}><RiDeleteBin5Line />delete</button>
			<button className={styles.tooltip_button}><IoColorPaletteOutline/>color</button>
			<button className={styles.tooltip_button}><GiResize />thickness</button>
			<button className={styles.tooltip_button}><AiOutlineHighlight/>highlight</button>
			<button className={styles.tooltip_button}><TbCircleDashed/>opacity</button>
			<button className={styles.tooltip_button}><MdOutlineShapeLine />marker</button>
			<button className={styles.tooltip_button}><AiOutlineHighlight/>highlight</button>
		</PixelDND>
		<PixelDND id="TooltipAll" className={styles.tooltip}>
			<button className={styles.tooltip_button}><RiDeleteBin5Line />delete</button>
			<button className={styles.tooltip_button}><IoColorPaletteOutline/>color</button>
			<button className={styles.tooltip_button}><AiOutlineHighlight/>highlight</button>
			<button className={styles.tooltip_button}><TbCircleDashed/>opacity</button>
		</PixelDND>
		<PixelDND id="TooltipCluster" className={styles.tooltip}>
			<button className={styles.tooltip_button}><IoColorPaletteOutline/>BGcolor</button>
			<button className={styles.tooltip_button}><TbCircleDashed/>opacity</button>
		</PixelDND>
		<div id='Range' className={styles.subtooltip}>
			<input id='RangeInput' className={styles.range} type='range' min={1} max={10} step={1}/>
			<p id='InputValue' className={styles.ragne_value}></p>
		</div>
		<div id='Markers' className={styles.subtooltip}>
			<button className={styles.subtooltip_button}>No</button>
			<button className={styles.subtooltip_button}>▶︎</button>
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
		
	</div>
};


export default GraphComic;