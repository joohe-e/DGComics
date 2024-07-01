import styles from '../styles/Graphcomic.module.css'
import React, { memo, Suspense, use, useEffect, useRef, useState } from 'react';
import { PercentDND } from './Draggable';
import StaticGraph from './StaticGraph';
import { getCategory } from '../api/graph';

// TODO: WE NEED TO CONSIDER DIRECTED GRAPH
function getSupporter (links, mainCharacters, value){
	const nodeSums = {};
	for(let target of mainCharacters) {
		target = target.replaceAll(" ", "_");
		links.forEach(link => {
			if (link.source === target) {
				if (!nodeSums[link.target]) nodeSums[link.target] = 0;
					nodeSums[link.target] += link.value;
			} else if (link.target === target) {
				if (!nodeSums[link.source]) nodeSums[link.source] = 0;
					nodeSums[link.source] += link.value;
			}
		});
	}
	const allNodes = Object.entries(nodeSums).map(([node, sum]) => ({id: node, weight: sum}));
	allNodes.sort((a, b) => b.weight - a.weight);
	// const filteredNodes = allNodes.filter(node => node.num_links >= value);
    const topNodesCount = Math.ceil(allNodes.length * (value / 100));
    const filteredNodes = allNodes.slice(0, topNodesCount);
    return filteredNodes;
}


export const GraphDND = ({  width,
                            height,
                            data_name,
                            graph,
                            mode,
                            size,
                            focusId,
                            focusedCanvasIndex,
                            setFocusedCanvasIndex,
                            mainCharacter,
                            setCurrentGraphId,
                            thumbnails,
                            setThumbnails,
                            isBrush,
                            setCurrentSupporter,
                            supportCandidate,
                            setSupportCandidate,
                            supporter,
                            highlight,
                            pos,
                            classes,
                            linkClasses,
                            setLinkClasses,
                            posState,
                            setPosState,
                            color,
                            gutter,
                            setSupporter,
                            setHighlight,
                            threshold,
                            freshGenerate
                        }) => {
    const [graphId, setGraphId] = useState(graph.range);
    const [isFocusing, setIsFocusing] = useState(false);
    const [currentSupportCandidate, setCurrentSupportCandidate] = useState([]);
    const [categories, setCategories] = useState({});

    useEffect(() => {
        const fetchDataAndUpdate = async () => {
            const range = graph.range.split("-");
            const from = range[0];
            const to = range[range.length - 1];
            setCategories(await getCategory(data_name, from, to, ""));
            setGraphId(graph.range);
            const sup = getSupporter(graph.full_graph.links, mainCharacter, 100);
            setCurrentSupportCandidate(sup);
        }
        fetchDataAndUpdate();
    }, [graph]);

    // Update supporter and highlight based on the main character
    useEffect(() => {
        if(!isFocusing || !mainCharacter) return;
        supportCandidate[graphId] = getSupporter(graph.full_graph.links, mainCharacter, 100);
        setSupportCandidate({...supportCandidate});
    }, [mainCharacter]);

    useEffect(() => {
        if(!isFocusing) return;
        // supportCandidate[parseInt(graphId.split("-")[0])] = currentSupportCandidate;
        supportCandidate[graphId] = currentSupportCandidate;
        setSupportCandidate({...supportCandidate});
    }, [isFocusing, currentSupportCandidate]);


    const result = <>
        <PercentDND
            className={`${styles.graph}`}
            parent_size={{width: width, height: height}}
            prev_size={{width: size.width, height: size.height}}
            prev_position={{x: size.x, y: size.y}}
            focusId={focusId}
            focusedCanvasIndex={focusedCanvasIndex}
            onFocus={async(e) => {
                setIsFocusing(true);
                setCurrentGraphId(graphId);
                // setCurrentSupporter(supporter[parseInt(graphId.split("-")[0])]);
                setCurrentSupporter(supporter[graphId]);
            }}
            onBlur={(e) => {
                const parentElement = e.target.parentElement;
                const relatedTarget = e.relatedTarget;
                const isSibling = Array.from(parentElement.children).includes(relatedTarget);
                if(!isSibling) return;
                setIsFocusing(false);
            }}
            setFocusedCanvasIndex={setFocusedCanvasIndex}
            text_pannel={graphId}
            gutter={gutter}
            z_index={graph.z_index}
        >
            <div
                data-html2canvas-ignore="true" 
                style={
                {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 20,
                    height: 20,
                    // remove the command to make the border
                    // width: "100%",
                    // height: 5,
                    backgroundColor: graph.color? graph.color : null,
                    // boxShadow: "0px 0px 5px 5px rgba(0,0,0,0.1)",
                    // opacity: 0.6,
                }
            }></div>
            {/* Remove the comment to make the border */}
            {/* <div
                data-html2canvas-ignore="true" 
                style={
                {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 5,
                    height: "100%",
                    backgroundColor: graph.color? graph.color : null,
                    boxShadow: "0px 0px 5px 5px rgba(0,0,0,0.1)",
                    opacity: 0.6,
                }
            }></div>
            <div
                data-html2canvas-ignore="true" 
                style={
                {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 5,
                    height: "100%",
                    backgroundColor: graph.color? graph.color : null,
                    boxShadow: "0px 0px 5px 5px rgba(0,0,0,0.1)",
                    opacity: 0.6,
                }
            }></div>
            <div
                data-html2canvas-ignore="true" 
                style={
                {
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "100%",
                    height: 5,
                    backgroundColor: graph.color? graph.color : null,
                    boxShadow: "0px 0px 5px 5px rgba(0,0,0,0.1)",
                    opacity: 0.6,
                }
            }></div> */}
            <StaticGraph 	
                    data={graph.full_graph}
                    graphAdd={graph.add_graph}
                    graphDelete={graph.delete_graph}
                    resetTransform={graph.reset_transform}
                    background={graph.background}
                    mainCharacter={mainCharacter}
                    // supporter={supporter[parseInt(graphId.split("-")[0])]}
                    supporter={supporter[graphId]}
                    highlight={highlight[graphId]}
                    thumbnails={thumbnails}
                    setThumbnails={setThumbnails}
                    isBrush={isBrush}
                    cluster={graph.full_graph.clusters}
                    where={"GraphComic"}
                    categories={categories}
                    position={pos}
                    classes={classes}
                    linkClasses={linkClasses}
                    setLinkClasses={setLinkClasses}
                    posState={posState}
                    setPosState={setPosState}
                    color={color}
                    freshGenerate={freshGenerate}
            />
            {graph.canvas.map((canvas, index) => {
                return canvas;
            })}
        </PercentDND>
    </>;

    graph.reset_transform = false;

    return result;
}