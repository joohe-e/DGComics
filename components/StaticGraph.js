import React, { memo, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { TwitterPicker } from 'react-color';
import styles from '../styles/Graph.module.css';
import stylesComic from '../styles/Graphcomic.module.css'
import { BubbleSet, PointPath, ShapeSimplifier, BSplineShapeGenerator } from '../api/bubblesets';
import * as d3 from 'd3';
import { EMPTY_ARRAY } from '../constants';
import { getFilterChosenGraph, getFilterEditChecked, resetFilterEditChecked } from './Filter';

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const usePreviousDebugger = (value, initialValue) => {
  const ref = useRef(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const generateUniqueId = (clusterData, baseId) => {

  const existingIndices = clusterData
    .map(cluster => cluster.id)
    .filter(id => id.startsWith(baseId))
    .map(id => {
      const suffix = id.slice(baseId.length);
      const match = suffix.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(number => number !== null) 
    .sort((a, b) => a - b);

  let newIndex = 0;
  for (let i = 0; i < existingIndices.length; i++) {
    if (existingIndices[i] !== newIndex) {
      break;
    }
    newIndex++;
  }

  const newId = `${baseId}-${newIndex}`;
  return newId;
}

const useEffectDebugger = (effectHook, dependencies, dependencyNames = []) => {
  const previousDeps = usePreviousDebugger(dependencies, []);

  const changedDeps = dependencies.reduce((accum, dependency, index) => {
    if (dependency !== previousDeps[index]) {
      const keyName = dependencyNames[index] || index;
      return {
        ...accum,
        [keyName]: {
          before: previousDeps[index],
          after: dependency
        }
      };
    }

    return accum;
  }, {});

  if (Object.keys(changedDeps).length) {
    console.log('[use-effect-debugger] ', changedDeps);
  }

  useEffect(effectHook, dependencies);
};

const tableau10 = ["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"];

const StaticGraph = memo(({  data, 
                        graphAdd, 
                        graphDelete, 
                        resetTransform,
                        background,
                        mainCharacter, 
                        supporter,
                        highlight,
                        thumbnails,
                        setThumbnails,
                        isBrush,
                        cluster,
                        where,
                        categories,
                        position,
                        classes,
                        linkClasses,
                        setLinkClasses,
                        posState,
                        setPosState,
                        color,
                        freshGenerate,  }) => {
  const chartRef = useRef(null);
  const eventListener = useRef(null);
  const svgRef = useRef(null);
  const nodeRef = useRef(null);
  const linkRef = useRef(null);
  const bubbleRef = useRef(null);
  const simulationRef = useRef(null);
  const prevDataRef = useRef(data);
  let dragArea = null;
  const [tooltipInfo, setTooltipInfo] = useState({
    display: false,
    id: '',
    category: '',
    x: 0,
    y: 0
  });
  
	const [neighbourData, setNeighbourData] = useState(null)
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [initialPos, setInitialPos] = useState({});
  const [polygon, setPolygon] = useState([]);
  const [fileterList, setfilterList] = useState(['#F28E2B']);
  const prevData = usePrevious(neighbourData);
  const [canvasPos, setCanvasPos] = useState({});
  const transformState = useRef(null);

  // Zoom function
  function zoomed(event) {
    d3.select(chartRef.current).select('#SVG').select('g').attr('transform', event.transform);
    transformState.current = event.transform;
  } 

  const zoom = d3.zoom().on('zoom', zoomed);

  //use below to use the entire canvas position
  useEffect(() => {
    const element = document.getElementById("GraphComic");
    if (element) {
      const rect = element.getBoundingClientRect();
      setCanvasPos(rect);
    }
  }, []);

  // useEffect(() => {
  //   if(position != undefined){
  //     setInitialPos(position);
  //   }}, [position]);

  useEffect(() => {
    if(cluster!=undefined){
      setClusterData(cluster);
    }
  }, [cluster]);

  const preValue = usePrevious({data, mainCharacter, neighbourData, selectedNodes, selectedLinks, isBrush, posState, clusterData});
  const lineGenerator = d3.line();
  
  function removeTooltip(){
    const tooltips = Array.from(document.getElementsByClassName(`${stylesComic.tooltip}`))
    tooltips.map((item) => {item.style = 'none'})

    const graphComicDiv = document.getElementById('GraphComic');
    const twitterPicker = document.getElementById('ColorPicker');
    // if(twitterPicker) graphComicDiv.removeChild(twitterPicker);
    if(twitterPicker){
      tooltips.forEach((item) => {
      if (item.contains(twitterPicker)) {
        item.removeChild(twitterPicker);
      }
    })};

    Array.from(document.getElementsByClassName(`${stylesComic.subtooltip}`)).map((item) => item.style.display = 'none') 
  }

  function handleBgClink(event) {
    if(event) event.stopPropagation();
    setSelectedNodes(EMPTY_ARRAY);
    setSelectedLinks(EMPTY_ARRAY);
    d3.selectAll(`.${styles.selected}`).classed(styles.selected, false);
    removeTooltip()
  }

    if(isBrush){
      d3.select(chartRef.current).select('#SVG').call(d3.drag()
          .on("start", lassoStart)
          .on("drag", lassoMove)
          .on("end", lassoEnd));          
    } else {
      d3.select(chartRef.current).select('#SVG').on(".drag", null); 
    }
    
  function isInPolygon(point, poly){
    let x = point[0];
    let y = point[1];
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      let xi = poly[i][0];
      let yi = poly[i][1];
      let xj = poly[j][0];
      let yj = poly[j][1];

      if ( yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function doLineSegmentsIntersect(p1, p2, p3, p4) {
    function CCW(p1, p2, p3) {
        return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return CCW(p1, p3, p4) !== CCW(p2, p3, p4) && CCW(p1, p2, p3) !== CCW(p1, p2, p4);
}

  function lassoStart(event) {
    removeTooltip();
    let mouseX = event.x;
    let mouseY = event.y;
    setPolygon([...[mouseX, mouseY]])
    setSelectedNodes(EMPTY_ARRAY)

    d3.select("#lasso").remove();
    d3.select(chartRef.current).select("#SVG")
        .append("path")
        .attr("id", "lasso");
  }

  function lassoMove(event) {
    let mouseX = event.x;
    let mouseY = event.y;
    const newPolygon = polygon.splice(polygon.length-2, 0, [mouseX, mouseY])
    setPolygon([...newPolygon])

    d3.select("#lasso")
      .style("stroke", "#888")
      .style("stroke-width", 2)
      .style("fill", "#3333")
      .attr("d", lineGenerator(polygon));
  }

  function lassoEnd(event) {
    d3.select("#lasso").remove();
    const nodes = neighbourData.nodes
    const links = neighbourData.links
    const canvas = d3.select(chartRef.current).node().getBoundingClientRect()

    function getNodePos(nodeid) {
      const circle = document.getElementById(`${where}-${data.time}-${nodeid}`).getBoundingClientRect();
      return {
        x: circle.x - canvas.x,
        y: circle.y - canvas.y,
      }
    }

    const newselectedNodes = nodes.filter(node => {
      const circle = document.getElementById(`${where}-${data.time}-${node.id}`).getBoundingClientRect()
      return isInPolygon([circle.x - canvas.x, circle.y - canvas.y], polygon)
    });
    const newselectedLinks = links.filter(link => {
      const nodeInclusion = newselectedNodes.some(node => node.id === link.source.id) &&
                            newselectedNodes.some(node => node.id === link.target.id);

      if (nodeInclusion) return true; 
      const linkStart = getNodePos(link.source.id);
      const linkEnd = getNodePos(link.target.id);
  
      // Check against each edge of the polygon
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const polyStart = { x: polygon[i][0], y: polygon[i][1] };
          const polyEnd = { x: polygon[j][0], y: polygon[j][1] };
  
          if (doLineSegmentsIntersect(linkStart, linkEnd, polyStart, polyEnd)) {
              return true; // The link intersects the polygon
          }
      }
      return false; // No intersection found
  });
  
    setSelectedNodes(newselectedNodes)
    setSelectedLinks(newselectedLinks)

    if(polygon.length < 3) {
      removeTooltip();
      setPolygon([])
      return;
    }
    let tooltip = document.getElementById("TooltipAll")
    //display based on the tooltip type
    if(newselectedLinks.length * newselectedNodes.length !== 0){
      d3.select('#TooltipAll')
      .style('display', 'flex')
      // .style('left', (event.sourceEvent.pageX+10) + 'px')   
      // .style('top', (event.sourceEvent.pageY+10) + 'px');
      .style('left', canvasPos.right + 'px')   
      .style('top', canvasPos.top + 'px');

    } else if(newselectedLinks.length === 0 && newselectedNodes.length !== 0){
      d3.select('#TooltipNode')
      .style('display', 'flex')
      .style('left', canvasPos.right + 'px')   
      .style('top', canvasPos.top + 'px')
    
      tooltip = document.getElementById("TooltipNode")
    } else if(newselectedLinks.length !== 0 && newselectedNodes.length === 0){
      d3.select('#TooltipLink')
      .style('display', 'flex')
      .style('left', canvasPos.right + 'px')   
      .style('top', canvasPos.top + 'px')
    
      tooltip = document.getElementById("TooltipLink")
    }

    const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
    buttons.map((element, index) => {
      element.onclick = (e) => handleTooltipClick(e, element.innerText, newselectedNodes, newselectedLinks, index)
    })
  }

  // change node color
  function colorChange(color, nodes, links) {
    let updatedNodes = neighbourData.nodes, updatedLinks = neighbourData.links;

    if(nodes.length > 0){ // node or all
      updatedNodes = updatedNodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          node.color = color.hex;
        }
        return node
      })

    }
    if(links.length > 0) {
      updatedLinks = updatedLinks.map((link) => {
        if (links.some(selectedLink => selectedLink.index === link.index)) {
          link.color = color.hex;
          const sourceId = link.source.id.replace(/\./g, ''); 
          const targetId = link.target.id.replace(/\./g, '');
          const markerId = `arrowhead-${data.from}-${data.to}-${sourceId}-${targetId}`;

          let marker = d3.select(`#${markerId}`);
          marker.select('path')
                .attr('fill', color.hex);
        }
        return link
      })
      
      
    }

    setNeighbourData({...neighbourData, nodes: updatedNodes, links: updatedLinks})
  }

  function strokeColorChange(color, nodes) {
    let updatedNodes = neighbourData.nodes;

      updatedNodes = updatedNodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          node.stroke = color.hex;
        }
        return node
      })

    setNeighbourData({...neighbourData, nodes: updatedNodes})
  }

  function backgroundChange(color, clusterNames) {
    const newClusterData = clusterData.map(cluster => {
      if(cluster === clusterNames) cluster.color = color.hex
      return cluster
    })
    setClusterData(newClusterData)
  }

  function sizeChange(event, nodes, links) {
    document.getElementById('InputValue').innerText = event.target.value
    if(nodes.length > 0){
      const updatedNodes = neighbourData.nodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          node.size = event.target.value;
        }
        return node
      })
      
      setNeighbourData({...neighbourData, nodes: updatedNodes})
    } else {
      const updatedLinks = neighbourData.links.map((link) => {
        if (links.some(selectedLink => selectedLink.index === link.index)) {
          link.size = event.target.value;
        }
        return link
      })
      
      setNeighbourData({...neighbourData, links: updatedLinks})
    }
  }

  function strokeChange(event, nodes) {
    document.getElementById('InputValue').innerText = event.target.value
      const updatedNodes = neighbourData.nodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          node.stroke_width = event.target.value;
        }
        return node
      })
      setNeighbourData({...neighbourData, nodes: updatedNodes})
  }
  
  function markerChange(event, marker, links){
    if(!links[0].is_directed) return;
    let newMarker = links[0].marker;
    if(marker === 'No') newMarker = '';
    else if(marker === '▶︎') newMarker = 'M0,-5L10,0L0,5';
    else if(marker === '◣') newMarker = 'M0,-7L10,0L0,0';
    else if(marker === '◗') newMarker = 'M0,-5A5,5 0 1,1 0,5A5,5 0 1,1 0,-5';

    const updatedLinks = neighbourData.links.map((link) => {
      if (links.some(selectedLink => selectedLink.index === link.index)) {
        link.marker = newMarker;
        link.viewBox = marker ==='◣' ? "0 -7 10 7" : '0 -5 10 10'; 
      }
      return link
    })
    
    setNeighbourData({...neighbourData, links: updatedLinks})
  }

  function labelChange(event, label, nodes){
    const updatedNodes = neighbourData.nodes.map((node) => {
      if (nodes.some(selectedNode => selectedNode.id === node.id)) {
        node.custom_label = label;
      }
      return node;
    })
    
    handleBgClink();
    setNeighbourData({...neighbourData, nodes: updatedNodes})
  }

  function fontSizeChange(event, nodes) {
    document.getElementById('InputValue').innerText = event.target.value
      const updatedNodes = neighbourData.nodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          node.font_size = event.target.value;
        }
        return node
      })
      setNeighbourData({...neighbourData, nodes: updatedNodes})
  }

  function classChange(event, custom_class, links){
    const label = document.getElementById('Label');
    const updatedLinks = neighbourData.links.map((link) => {
      if (links.some(selectedLink => selectedLink.index === link.index)) {
        link.custom_class = custom_class;
      }
      return link
    })
    handleBgClink();
    setLinkClasses(new Set(linkClasses.add(custom_class)))
    setNeighbourData({...neighbourData, links: updatedLinks})
  }

  function thumbnailChange(event, nodes) {
    if(event.target.files[0]) {
      const newThumbnails = thumbnails;
      neighbourData.nodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          var reader = new FileReader();
          if(!event.target.files[0]) {
            return;
          }
          reader.readAsDataURL(event.target.files[0]);
          reader.onload = function () {
            const base64 = reader.result;
            newThumbnails[node.id] = base64;
            setThumbnails({...newThumbnails});
          };
          reader.onerror = function (error) {
            console.log('Error: ', error);
          };
        }
      })
      event.target.value = ''; // reset 
    }
  }

  function highlightChange(event, type, nodes, links, color){
    let updatedNodes = neighbourData.nodes, updatedLinks = neighbourData.links;

    if(type === 'color') setfilterList([...fileterList, color]);
    if(nodes.length > 0){
      updatedNodes = updatedNodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          delete node.filter
          delete node["stroke-dasharray"]
          node.fill_opacity = 0.7;
          if(type === 'color') node.filter = `url(#neon-${color.split('#')[1]})`;
          if(type === 'dash') {
            node.fill_opacity = 0.0;
            node["stroke-dasharray"] = "1,1";
          }
        }
        return node
      })
    }
    
    if(links.length > 0) {
      updatedLinks = updatedLinks.map((link) => {
        if (links.some(selectedLink => selectedLink.index === link.index)) {
          delete link.filter
          delete link["stroke-dasharray"]
          if(type === 'color') link.filter = `url(#neon-${color.split('#')[1]})`;
          if(type === 'dash') {
            link["stroke-dasharray"] = "1,1";
          }
        }
        return link
      })
    }

    setNeighbourData({...neighbourData, nodes:updatedNodes, links: updatedLinks})
  }

  function opacityChange(event, nodes, links){
    let updatedNodes = neighbourData.nodes, updatedLinks = neighbourData.links;
    document.getElementById('InputValue').innerText = event.target.value

    if(nodes.length > 0){
      updatedNodes = updatedNodes.map((node) => {
        if (nodes.some(selectedNode => selectedNode.id === node.id)) {
          if(node.cluster_opacity) {
            node.cluster_opacity = event.target.value;
          } else {
            node.opacity = event.target.value;
          }
        }
        return node
      })
      
    }
    if(links.length > 0) {
      updatedLinks = updatedLinks.map((link) => {
        if (links.some(selectedLink => selectedLink.index === link.index)) {
          if(link.cluster_opacity) {
            link.cluster_opacity = event.target.value;
            const sourceId = link.source.id.replace(/\./g, ''); 
            const targetId = link.target.id.replace(/\./g, '');
            const markerId = `arrowhead-${data.from}-${data.to}-${sourceId}-${targetId}`;

            let marker = d3.select(`#${markerId}`);
            marker.select('path')
                  .attr('opacity', event.target.value);
          } else {
            link.opacity = event.target.value;
            const sourceId = link.source.id.replace(/\./g, ''); 
            const targetId = link.target.id.replace(/\./g, '');
            const markerId = `arrowhead-${data.from}-${data.to}-${sourceId}-${targetId}`;

            let marker = d3.select(`#${markerId}`);
            marker.select('path')
                  .attr('opacity', event.target.value);
          }
        }
        return link
      })
    }
    setNeighbourData({...neighbourData, nodes:updatedNodes, links: updatedLinks})
  }

  function BGopacityChange(event, clusterNames){
    document.getElementById('InputValue').innerText = event.target.value
    const newClusterData = clusterData.map(cluster => {
      if(cluster === clusterNames) cluster.opacity = event.target.value
      return cluster
    })
    setClusterData(newClusterData);
  }

  function createNeonGlowFilter(svg, color) {
    const code = color.split('#')[1]
    const defs = svg.append('defs');
    
    // Create filter with the provided ID
    const filter = defs.append('filter')
      .attr('id', `neon-${code}`)
      .attr('width', '250%')
      .attr('height', '250%')
      .attr('x', '-75%')
      .attr('y', '-75%');

    // Append stdDeviation to make it smooth
    filter.append('feGaussianBlur')
      .attr('stdDeviation', 2)
      .attr('result', `${code}-coloredBlur`);

    // Append feFlood to set the provided color
    filter.append('feFlood')
      .attr('flood-color', color)
      .attr('result', `${code}-color`);
    
    // Composite feFlood and feGaussianBlur
    filter.append('feComposite')
      .attr('in', `${code}-color`)
      .attr('in2', `${code}-coloredBlur`)
      .attr('operator', 'in')
      .attr('result', `${code}-coloredBlur`);
    
    // Create another feMerge filter with original SourceGraphic and the modified component
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', `${code}-coloredBlur`);
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  function updateSubTooltipPosition(tooltip, subTooltip, index) {
    if (!tooltip || !subTooltip) return;

    subTooltip.style.display = 'flex';
    subTooltip.style.position = 'absolute'
    subTooltip.style.left = `3rem`
    subTooltip.style.top = `calc(1rem + ${(index-1) * 2.2}rem)`

    tooltip.appendChild(subTooltip);
  }

  // Tooltip button event listener
  function handleTooltipClick(event, type, nodes, links, index, clusterNames) {
    let tooltip;
    if(nodes.length + links.length === 0) tooltip = document.getElementById('TooltipCluster');
    else if(nodes.length * links.length !== 0) tooltip = document.getElementById('TooltipAll');
    else if(nodes.length !== 0 ) tooltip = document.getElementById('TooltipNode');
    else tooltip = document.getElementById('TooltipLink');

    const graphComicDiv = document.getElementById('GraphComic');
    const twitterPicker = document.getElementById('ColorPicker');
    // if(twitterPicker) graphComicDiv.removeChild(twitterPicker);
    if(twitterPicker) tooltip.removeChild(twitterPicker);
    Array.from(document.getElementsByClassName(`${stylesComic.subtooltip}`)).map((item) => item.style.display = 'none') 

    if(type === 'delete') {
      let updatedNodes = neighbourData.nodes, updatedLinks = neighbourData.links;

      if(nodes.length > 0){ // node or all
        updatedNodes = updatedNodes.filter(node => {
          if(nodes.some(selectedNode => selectedNode.id === node.id)) return false;
          else return true;
        });
  
        updatedLinks = updatedLinks.filter(link => {
          if(nodes.some(selectedNode => selectedNode.id === link.source.id || selectedNode.id === link.target.id )) return false;
          else return true;
        });
        setSelectedNodes(EMPTY_ARRAY);
      }

      if(links.length > 0){ // link or all
        updatedLinks = updatedLinks.filter(link => {
          if(links.some(selectedLink => selectedLink.index === link.index )) return false;
          else return true;
        });
        setSelectedLinks(EMPTY_ARRAY);
      }

      if(clusterNames){
        let updateCluster = clusterData;
        updateCluster = updateCluster.filter(cluster => cluster !== clusterNames)
        setClusterData(updateCluster)
      }

      setNeighbourData({...neighbourData, nodes: updatedNodes, links: updatedLinks})
      removeTooltip();
    }

    else if(type === 'X'){
      event.stopPropagation();
      removeTooltip();
      setSelectedNodes(EMPTY_ARRAY);
      setSelectedLinks(EMPTY_ARRAY);
    }

    else if(type === 'color'){
      const twitterPicker = document.createElement('div');
      twitterPicker.id = 'ColorPicker';

      updateSubTooltipPosition(tooltip, twitterPicker, index)

      // Render the TwitterPicker component inside the created element
      ReactDOM.createRoot(twitterPicker).render(<TwitterPicker colors={tableau10} onChangeComplete={(event) => colorChange(event, nodes, links)} triangle={'hide'}/>);
    }

    else if(type === 'STcolor'){
      const twitterPicker = document.createElement('div');
      twitterPicker.id = 'ColorPicker';

      updateSubTooltipPosition(tooltip, twitterPicker, index)

      // Render the TwitterPicker component inside the created element
      ReactDOM.createRoot(twitterPicker).render(<TwitterPicker colors={tableau10} onChangeComplete={(event) => strokeColorChange(event, nodes)} triangle={'hide'}/>);
    }

    else if (type === 'BGcolor'){
      const twitterPicker = document.createElement('div');
      twitterPicker.id = 'ColorPicker';

      updateSubTooltipPosition(tooltip, twitterPicker, index)

      // Render the TwitterPicker component inside the created element
      ReactDOM.createRoot(twitterPicker).render(<TwitterPicker colors={tableau10} onChangeComplete={(event) => backgroundChange(event, clusterNames)} triangle={'hide'}/>);
    }

    else if(type === 'size' || type === 'thickness'){
      const range = document.getElementById('Range');
      const input = document.getElementById('RangeInput');
      const prev_value = nodes.length > 0 ? nodes[nodes.length-1].size : links[links.length-1].size;
      document.getElementById('InputValue').innerText =prev_value;

      input.value = prev_value;
      input.max = nodes.length > 0 ? 100 : 50;
      input.step = nodes.length > 0 ? 1 : 0.5;
      updateSubTooltipPosition(tooltip, range, index);

      range.oninput = (event) => sizeChange(event, nodes, links);
    }

    else if(type === 'stroke'){
      const range = document.getElementById('Range');
      const input = document.getElementById('RangeInput');
      const prev_value = nodes[nodes.length-1].stroke_width;
      document.getElementById('InputValue').innerText =prev_value;

      input.value = prev_value;
      input.min = 0;
      input.max = 50;
      input.step = 1;
      updateSubTooltipPosition(tooltip, range, index);

      range.oninput = (event) => strokeChange(event, nodes);
    }

    else if(type === 'opacity') {
      const range = document.getElementById('Range');
      const input = document.getElementById('RangeInput');
      const prev_value = clusterNames ? clusterData.filter(cluster => cluster==clusterNames).opacity : nodes.length > 0 ? nodes[nodes.length-1].opacity : links[links.length-1].opacity;
      document.getElementById('InputValue').innerText = prev_value ? prev_value : 0.3;

      input.value = prev_value;
      input.min = 0.0;
      input.max = 1.0;
      input.step = 0.1;
      updateSubTooltipPosition(tooltip, range, index);

      range.oninput = (event) => clusterNames ?BGopacityChange(event, clusterNames) : opacityChange(event, nodes, links);
    }

    else if(type === 'marker'){
      const markers = document.getElementById('Markers');
      updateSubTooltipPosition(tooltip, markers, index);
      const buttons = Array.from(markers.getElementsByClassName(`${stylesComic.subtooltip_button}`))
      buttons.map((element) => {
        element.onclick = (e) => markerChange(e, element.innerText, links)
      })
    }

    else if(type === 'label'){
      const label = document.getElementById('Label');
      const input = document.getElementById('LabelInput');
      const button = document.getElementById('LabelButton');

      input.value = nodes[nodes.length-1].label;
      updateSubTooltipPosition(tooltip, label, index);
      button.onclick = (e) => labelChange(e, input.value, nodes)
    }

    else if(type === 'Lsize'){
      const range = document.getElementById('Range');
      const input = document.getElementById('RangeInput');
      const prev_value = nodes[nodes.length-1].font_size;
      document.getElementById('InputValue').innerText = prev_value ? prev_value : 0.5;

      input.value = prev_value;
      input.min = 0.0;
      input.max = 2.0;
      input.step = 0.1;
      updateSubTooltipPosition(tooltip, range, index);

      range.oninput = (event) => fontSizeChange(event, nodes);
    }

    else if(type === 'class'){
      const label = document.getElementById('Label');
      const input = document.getElementById('LabelInput');
      const button = document.getElementById('LabelButton');

      input.value = links[links.length-1].custom_class;
      updateSubTooltipPosition(tooltip, label, index);
      button.onclick = (e) => classChange(e, input.value, links)
    }

    else if(type === 'highlight'){
      const highlight_type = document.getElementById('HighlightType');

      updateSubTooltipPosition(tooltip, highlight_type, index);

      const buttons = Array.from(highlight_type.getElementsByClassName(`${stylesComic.subtooltip_button}`))
      buttons.map((element) => {
        if(element.innerText === 'color')
          element.onclick = (e) => {
            const graphComicDiv = document.getElementById('GraphComic');
            const twitterPicker = document.createElement('div');
      
            twitterPicker.id = 'ColorPicker';
            updateSubTooltipPosition(tooltip, twitterPicker, index);
      
            tooltip.appendChild(twitterPicker);
      
            ReactDOM.createRoot(twitterPicker).render(<TwitterPicker colors={tableau10} onChangeComplete={(event) => highlightChange(null, element.innerText, nodes, links, event.hex)} triangle={'hide'}/>);
            Array.from(document.getElementsByClassName(`${stylesComic.subtooltip}`)).map((item) => item.style.display = 'none');
          }
        else element.onclick = (e) => highlightChange(e, element.innerText, nodes, links)
      })
    }

    else if(type === 'image'){
      const button = document.getElementById('ThumbnailButton');
      button.onchange = (e) => thumbnailChange(e,nodes)
      button.click();
    }

    else if(type === 'cluster'){
      const baseId = `custom-${data.from}-${data.to}`;
      const newId = generateUniqueId(clusterData, baseId);
      
      const newCluster = {
        time: data.time,
        id: newId,
        data: nodes.map((dict) => {return dict.label}),
        color: '#e66465'
      }
      setClusterData([...clusterData, newCluster]);
    }
  }


  useEffect(() => {

    function eventCallback(e) {
      if(!e) return;
      e.preventDefault();
      //prevent edit in timeline
      if(where === "Timeline") return;
      if(!neighbourData) return;
      const edit_checked = getFilterEditChecked();
      const edit_char = Object.keys(edit_checked).filter(key => edit_checked[key]);
      const newSelectedNodes = neighbourData.nodes.filter(node => edit_char.some(d => d === node.id));
      if(edit_char[0] && neighbourData.time !== getFilterChosenGraph().split("-")[0]) return;
      if(newSelectedNodes.length === 0) return;
      setSelectedNodes(newSelectedNodes);
      d3.select('#TooltipNode')
        .style('display', 'flex')
        // .style('left', (e.pageX-500) + 'px')   
        // .style('top', (e.pageY+50) + 'px');
        .style('left', canvasPos.right + 'px')   
        .style('top', canvasPos.top + 'px');
      
      const tooltip = document.getElementById("TooltipNode");
      const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`));
      buttons.map((element, index) => {
        element.onclick = (e) => handleTooltipClick(e, element.innerText, newSelectedNodes, selectedLinks, index);
      });
      // resetSelection(e, 'edit-select', "support");
      resetFilterEditChecked();
    }

    // document.getElementById('edit-select').addEventListener('click', (e) => {

    if(where !== "Timeline") {
      if(eventListener.current) {
        window.removeEventListener('edit', eventListener.current);
      }
      window.addEventListener('edit', eventCallback);
      eventListener.current = eventCallback;
    }

    function handleNodeClick(event, d) {
      event.stopPropagation();
      removeTooltip();
      if(where === "Timeline") return;
      let newSelectedNodes =[];

      const isAlreadySelected = selectedNodes.some(node => node.id === d.id);
      if (isAlreadySelected) {
        newSelectedNodes = selectedNodes.filter(node => node.id !== d.id);
      } else {
        newSelectedNodes = [...selectedNodes, d];
        if(selectedLinks.length > 0) {
          d3.select('#TooltipAll')
            .style('display', 'flex')
            // .style('left', (event.pageX+10) + 'px')   
            // .style('top', (event.pageY+10) + 'px');
            .style('left', canvasPos.right + 'px')   
            .style('top', canvasPos.top + 'px');

          const tooltip = document.getElementById("TooltipAll")
          const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
          buttons.map((element, index) => {
            element.onclick = (e) => handleTooltipClick(e, element.innerText, newSelectedNodes, selectedLinks, index)
          })
        }
        else {
          d3.select('#TooltipNode')
            .style('display', 'flex')
            .style('left', canvasPos.right + 'px')   
            .style('top', canvasPos.top + 'px')
          
          const tooltip = document.getElementById("TooltipNode")
          const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
          buttons.map((element, index) => {
            element.onclick = (e) => handleTooltipClick(e, element.innerText, newSelectedNodes, selectedLinks, index)
          })
        }
      }
      // ISSUE : only the last element selected changes
      event.target.classList.toggle(styles.selected);
      setSelectedNodes(newSelectedNodes);
    }

    function handleLinkClick(event, d) {
      event.stopPropagation();
      removeTooltip();
      if(where==="Timeline") return;
      let newSelectedLinks = [];
      // id가 없는데 id를 체크하는게 문제 
      const isAlreadySelected = selectedLinks.some(link => link.source.id === d.source.id && link.target.id === d.target.id);
      if (isAlreadySelected) {
        newSelectedLinks = selectedLinks.filter(link => link.source.id !== d.source.id || link.target.id !== d.target.id);
      } else {
        newSelectedLinks = [...selectedLinks, d]
        if(selectedNodes.length > 0){
          d3.select('#TooltipAll')
            .style('display', 'flex')
            .style('left', canvasPos.right + 'px')   
            .style('top', canvasPos.top + 'px')

          const tooltip = document.getElementById("TooltipAll")
          const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
          buttons.map((element, index) => {
            element.onclick = (e) => handleTooltipClick(e, element.innerText, selectedNodes, newSelectedLinks, index)
          })
        }
        else {
          d3.select('#TooltipLink')
            .style('display', 'flex')
            .style('left', canvasPos.right + 'px')   
            .style('top', canvasPos.top + 'px')

          const tooltip = document.getElementById("TooltipLink")
          const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
          buttons.map((element, index) => {
            element.onclick = (e) => handleTooltipClick(e, element.innerText, selectedNodes, newSelectedLinks, index)
          })
      }
      }

      setSelectedLinks(newSelectedLinks);
    }

    function handleClusterClick(event, clusterNames) {
      event.stopPropagation();
      removeTooltip();
      if(where==="Timeline") return;

      d3.select('#TooltipCluster')
        .style('display', 'flex')
        .style('left', canvasPos.right + 'px')   
        .style('top', canvasPos.top + 'px')

      const tooltip = document.getElementById("TooltipCluster")
      const buttons = Array.from(tooltip.getElementsByClassName(`${stylesComic.tooltip_button}`))
      buttons.map((element, index) => {
        element.onclick = (e) => handleTooltipClick(e, element.innerText, [], [], index, clusterNames)
      })
    }
    // if(neighbourData && prevData !== neighbourData){
    if(neighbourData){
      const chartContainer = d3.select(chartRef.current);
      const SVG = chartContainer.select('#SVG').select('g');

      const width = chartContainer.node().getBoundingClientRect().width;
      const height = chartContainer.node().getBoundingClientRect().height - 5;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      SVG.selectAll('*').remove();
      const svg = SVG.append('g');

      svg.append('image')
        .attr("pointer-events", "none")
        .attr('href', background);

      const links = neighbourData.links
      const nodes = neighbourData.nodes
      const clusters = [];

      // Create a simulation with several forces.
      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => 50))
        .force("charge", d3.forceManyBody())
        // .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
        // .randomSource(() => 0.5)
        .alphaDecay(0.05);
      
      if(posState !== preValue.posState){
        if(posState=="fix"){
          nodes.forEach(node => {
            if (position[node.id] !== undefined) { 
              const minSide = Math.min(innerWidth, innerHeight);
              node.fx = (position[node.id].x) * minSide;
              node.fy = (position[node.id].y) * minSide;
              node.x = node.fx;
              node.y = node.fy;
            }
          });
      } else if(posState=="fill"){
          for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
            simulation.tick();
          }
          let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
          nodes.forEach(node => {
            if (node.x < xMin) xMin = node.x;
            if (node.x > xMax) xMax = node.x;
            if (node.y < yMin) yMin = node.y;
            if (node.y > yMax) yMax = node.y;
          });
          const xRange = xMax - xMin;
          const yRange = yMax - yMin;

          nodes.forEach(node => {
            node.fx = (node.x - xMin) / xRange * innerWidth;
            node.fy = (node.y - yMin) / yRange * innerHeight;
            node.x = node.fx;
            node.y = node.fy;
          });
        }
        else if(posState=="basic") {
          nodes.forEach(node => {
            delete node.fx;
            delete node.fy;
            // node.x = node.fx;
            // node.y = node.fy;
          });
        }
      }
      
      let already_has_position = true;
      for(const node of nodes){
        if(node.fx === undefined || node.fy === undefined){
          already_has_position = false;
          break;
        }
      }

      // const main = () => {
        simulation.stop();
        const maxLinkValue = Math.max(...links.map(link => link.value));
        const minMarkerSize = 6; // Minimum marker size
        const maxMarkerSize = 10; // Maximum marker size

        const weightedMarkerSize = (value) => {
            const scale = d3.scaleLinear()
                            .domain([0, maxLinkValue])
                            .range([minMarkerSize, maxMarkerSize]);
            return scale(value);
        };
        // Define the arrowhead marker for each link separately
        links.forEach(link => {
          const sourceId = link.source.id.replace(/\./g, ''); 
          const targetId = link.target.id.replace(/\./g, '');
          const markerSize = weightedMarkerSize(link.value);
  
          svg.append("defs").append("marker")
            .attr("id", `arrowhead-${data.from}-${data.to}-${sourceId}-${targetId}`)
            .attr("viewBox", link.viewBox)
            .attr("refX", 20)
            .attr("refY", 0)
            // .attr("markerWidth", 6)
            // .attr("markerHeight", 6)
            .attr("markerWidth", markerSize)
            .attr("markerHeight", markerSize)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto")
            .append("path")
            .attr("d", link.marker)
            .attr("fill", link.color) // Set arrow color based on the source node group
            .attr("opacity", (link.cluster_opacity ? link.cluster_opacity : link.opacity))
            .classed(styles.arrowSelected, selectedLinks.some(item => item.index === link.index)); // Add the 'selected' class based on selectedLinks
        });
  
        // Define a custom link generator with a curve
        const linkGenerator = d3.line()
          .curve(d3.curveCatmullRom.alpha(0.5)) // Adjust the curve tension (0.5 is the default, you can experiment with other values)
          .x(d => d.x)
          .y(d => d.y);

        function calculatePerpendicularOffset(source, target, offset) {
            // Calculate the vector from source to target
            const dx = target.x - source.x;
            const dy = target.y - source.y;
          
            // Calculate a vector that is perpendicular to the source-target vector
            const length = Math.sqrt(dx * dx + dy * dy);
            const unitX = dy / length;
            const unitY = -dx / length;
          
            // Apply the offset to the source and target positions
            return {
              source: { x: source.x + unitX * offset, y: source.y + unitY * offset },
              target: { x: target.x + unitX * offset, y: target.y + unitY * offset }
            };
          }
  
        function linkArc(d) {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.1; // Adjust the dr (radius) value to control the curvature
        
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        }

        fileterList.map(color => createNeonGlowFilter(svg, color))

        const clusterGroup = svg.append("g").attr("class", "clusters");

        const countEdge = {};
        links.forEach(link => {
          const sourceId = link.source.id;
          const targetId = link.target.id;
          const edge1 = `${sourceId}-${targetId}`;
          countEdge[edge1] = countEdge[edge1] ? countEdge[edge1] + 1 : 1;
          const edge2 = `${targetId}-${sourceId}`;
          countEdge[edge2] = countEdge[edge2] ? countEdge[edge2] + 1 : 1;
        });

        // Add a path with arrowhead marker for each link, and a circle for each node.
        const link = svg.append("g")
          .selectAll()
          .data(links)
          .join("path")
          .attr("class", "link")
          .attr("marker-end", d => {
            const sourceId = d.source.id.replace(/\./g, ''); 
            const targetId = d.target.id.replace(/\./g, '');
            if(d.is_directed) return `url(#arrowhead-${data.from}-${data.to}-${sourceId}-${targetId})`
            return '';
          })
          .attr("stroke-opacity", d=>d.opacity)
          .attr("stroke", d => d.color)
          // can change to d.value
          .attr("stroke-width", d => d.size)
          .attr("stroke-dasharray", d => d["stroke-dasharray"])
          .attr("stroke-dashoffset", 0.5)
          .attr("filter", d => d.filter)
          .attr("fill", "none")
          .attr("d", d => {
            const offset = 0; // Adjust this value as needed to avoid overlap
            const adjustedPositions = calculatePerpendicularOffset(d.source, d.target, d.is_directed ? offset : 0);
            const midpoint = (d.is_directed && countEdge[`${d.source.id}-${d.target.id}`] > 1)? {
            // const midpoint = (d.is_directed)? {
              x: (adjustedPositions.source.x + adjustedPositions.target.x) / 2,
              y: (adjustedPositions.source.y + adjustedPositions.target.y) / 2
            } : adjustedPositions.source;
            return linkGenerator([midpoint, adjustedPositions.target]);
          })
          .attr("stroke", d => d.color)
          .classed(styles.linkSelected, d => selectedLinks.some(link => link.index === d.index)) // Add the 'selected' class based on selectedLinks
          .on("click", handleLinkClick); 

          link.each(function (d) {
            if(d.custom_class.length > 0){
              d3.select(this).attr(d.custom_class, "");
            }
          });

        const images = svg.append("g")
          .selectAll()
          .data(nodes)
          .join("image")
          .attr("href", d => {return thumbnails ? thumbnails[d.id] : ''})
          .attr("x", d => -d.size)
          .attr("y", d => -d.size)
          .attr("width", d => d.size*2)
          .attr("height", d => d.size*2);

        const node = svg.append("g")
          .selectAll()
          .data(nodes)
          .join("circle")
          .attr("id", d => `${where}-${data.time}-${d.id}`)
          .attr("opacity", d=>d.opacity)
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .attr("r", d => d.size)
          .attr("fill", d =>  {return thumbnails && thumbnails[d.id] ? '#0000' : d.color})
          .attr("stroke", d => {return thumbnails && thumbnails[d.id] ? '#0000' : d.stroke})
          .attr("filter", d => d.filter)
          .attr("stroke-width", d => d.stroke_width)
          .attr("stroke-dasharray", d => d["stroke-dasharray"])
          .attr("fill-opacity", d => d.fill_opacity)
          .classed(styles.selected, d => selectedNodes.some(node => node.id === d.id)) // Add the 'selected' class based on selectedNodes
          .on("click", handleNodeClick)
          .on('mouseover', (event, d) => {
            // const [x, y] = d3.pointer(event, chartRef.current);
            // console.log("position", x, y)
            const pos = document.getElementById('ComicCanvas').getBoundingClientRect();
            const category = categories[d.id];

            const htmlContent = `
              <div class=${styles.infoTooltip}>
                <div>ID: ${d.id}</div>
                <div style="padding: '0.2rem 0'">
                  ${category && Object.keys(category).map((key) => {
                    return `
                      <div>
                        ${key}: ${category[key].map((value) => `<span class="${styles.category}">${value}</span><br/>`).join('')}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
            const tooltipElement = document.getElementById('TooltipInfo');
            tooltipElement.innerHTML = htmlContent;
            tooltipElement.style.display = 'flex';
            tooltipElement.style.position = 'absolute';
            tooltipElement.style.left = `${pos.right + 5}px`;
            tooltipElement.style.maxWidth = '12%';
            tooltipElement.style.top = `${pos.bottom - tooltipElement.offsetHeight}px`;
            })
            .on('mouseleave', () => {
                  const tooltipElement = document.getElementById('TooltipInfo');
                  tooltipElement.style.display = 'none';
            });
  
        node.each(function (d) {
          if(classes && classes.hasOwnProperty(d.id)){
            d3.select(this).attr(classes[d.id], "");
          }
        });

        // node.append("title")
        //   .text(d => d.id);
        // node.append("title")
        //   .text(d => {
        //     let title = `ID: ${d.id}\n`;
        //     if(categories === undefined) return title;
        //     for(const key in categories[d.id]){
        //       title += `${key}:[`;
        //       for(const value of categories[d.id][key]){
        //         title += `${value}\n`;
        //       }
        //       title += "]\n";
        //     }
        //     return title;
        //   });

        // Add a drag behavior.
        node.call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

        const texts = svg.selectAll("text.label")
          .data(nodes)
          .enter().append("text")
          .attr("class", "label")
          .attr("fill", "black")
          .style('fill', '#000')
          .style('font-size', d => d.font_size ? `${d.font_size}rem` : '0.5rem')
          .attr('text-anchor', 'middle') 
          .attr('x', d => d.label_x)
          .attr('y', d => d.label_y)
          .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
          .text(d => d.custom_label);

        texts.call(d3.drag()
          .on("start", labelDragStarted)
          .on("drag", labelDragging)
          .on("end", labelDragEnded));
        
        svgRef.current = svg;
        linkRef.current = link;
        nodeRef.current = node;
        simulationRef.current = simulation;

  
        // Run the simulation for a fixed number of iterations.
        if(!already_has_position) {
          for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
            simulation.tick();
          }
          simulation.restart().alpha(1);
          simulation.stop();
          for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
            simulation.tick();
          }

          const center = { x: innerWidth / 2, y: innerHeight / 2 };
          const centroid = nodes.reduce((acc, cur) => {
            acc.x += cur.x / nodes.length;
            acc.y += cur.y / nodes.length;
            return acc;
          }, { x: 0, y: 0 });
          
          nodes.forEach(node => {
            node.x = node.x + center.x - centroid.x;
            node.y = node.y + center.y - centroid.y;
            node.fx = node.x;
            node.fy = node.y;
          });
        }

        renderGraph();
        renderBubbleSet();
        
        // Now, calculate the bounding box of the nodes.
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        nodes.forEach(node => {
          if (node.x < xMin) xMin = node.x;
          if (node.x > xMax) xMax = node.x;
          if (node.y < yMin) yMin = node.y;
          if (node.y > yMax) yMax = node.y;
        });
        
        // Determine the scaling factors and translation offsets needed to fill the canvas.
        const xScale = innerWidth / (xMax - xMin);
        const yScale = innerHeight / (yMax - yMin);
        const xOffset = -xMin * xScale;
        const yOffset = -yMin * yScale;
        
        // if(fill) {
          // Apply the scaling and translation to the nodes' positions.
        //   nodes.forEach(node => {
        //     node.fx = node.x * xScale + xOffset;
        //     node.fy = node.y * yScale + yOffset;
        //   });
        // } else {
        //   nodes.forEach(node => {
        //     node.fx = null;
        //     node.fy = null;
        //   });
        // }
        
        // Set the position attributes of links and nodes each time the simulation ticks.
        /*function ticked() {
          link.attr("d", d => linkGenerator([d.source, d.target])); // Update the link paths using the custom link generator
          node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
          texts
            .attr('x', d => d.label_x)
            .attr('y', d => d.label_y)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
          images
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

            clusterData.forEach((names, i) => {
              const filtered_nodes = nodes.filter(node => names.data.includes(node.label));
              const color = names.color != null ? names.color : "black";
              clusters[i] = updateBubbleSets(clusterGroup, filtered_nodes, clusters[i], color, names.opacity ? names.opacity : 0.3, 1, color, names);
            });
        }*/

        function renderGraph() {
          const countEdge = {};
          links.forEach(link => {
            const sourceId = link.source.id;
            const targetId = link.target.id;
            const edge1 = `${sourceId}-${targetId}`;
            countEdge[edge1] = countEdge[edge1] ? countEdge[edge1] + 1 : 1;
            const edge2 = `${targetId}-${sourceId}`;
            countEdge[edge2] = countEdge[edge2] ? countEdge[edge2] + 1 : 1;
          });

          link
            .attr("d", d => {
              const offset = 0; // Adjust this value as needed to avoid overlap
              const adjustedPositions = calculatePerpendicularOffset(d.source, d.target, d.is_directed ? offset : 0);
              const midpoint = (d.is_directed && countEdge[`${d.source.id}-${d.target.id}`] > 1)? {
              // const midpoint = (d.is_directed)? {
                x: (adjustedPositions.source.x + adjustedPositions.target.x) / 2,
                y: (adjustedPositions.source.y + adjustedPositions.target.y) / 2
              } : adjustedPositions.source;
              return linkGenerator([midpoint, adjustedPositions.target]);
            })// Update the link paths using the custom link generator
          node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
          texts
            .attr('x', d => d.label_x)
            .attr('y', d => d.label_y)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
          images
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
        }

        function renderBubbleSet() {
          if(clusterData.length === 0) {
            link.data().forEach(d => {
              delete d.cluster_opacity;
            });
            node.data().forEach(d => {
              delete d.cluster_opacity;
            });
            return;
          }
          if (clusterData.length > 0) { // Check if clusterData is not empty
            let filteredNodes = [];


            clusterData.forEach((names, i) => {
              const nodeLabels = names.data; // Assuming 'data' is an array of node labels in the cluster
              const matchingNodes = nodes.filter(node => nodeLabels.includes(node.label));
              const color = names.color != null ? names.color : "black";
              clusters[i] = updateBubbleSets(clusterGroup, matchingNodes, clusters[i], color, names.opacity ? names.opacity : 0.3, 1, color, names);
              filteredNodes = [...filteredNodes, ...matchingNodes];
            });



            link
              .attr("opacity", d => {
                if(preValue.clusterData !== clusterData) {
                  delete d.cluster_opacity;
                }
                if(!d.cluster_opacity) {
                  d.cluster_opacity = (filteredNodes.some(node => node.id === d.source.id) &&
                                       filteredNodes.some(node => node.id === d.target.id)) ? 1 : 0.2;
                }
                return d.cluster_opacity;
              });

            node
              .attr("opacity", d => {
                if(preValue.clusterData !== clusterData) {
                  delete d.cluster_opacity;
                }
                if(!d.cluster_opacity) {
                  d.cluster_opacity = (filteredNodes.some(filteredNodes => filteredNodes.id === d.id)) ? 1 : 0.2;
                }
                return d.cluster_opacity;
              });
          }
        }

        //include opacity change
        function ticked() {
          renderGraph(); 
          renderBubbleSet();
        }
  
        // Reheat the simulation when drag starts, and fix the subject position.
        function dragstarted(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          if(!selectedNodes.includes(d)){
            d.fx = d.x;
            d.fy = d.y;
          }
          selectedNodes.forEach(node => {
            node.fx = node.x;
            node.fy = node.y;
          });
          ticked();
        }
  
        // Update the subject (dragged node) position during drag.
        function dragged(event, d) {
          if(!selectedNodes.includes(d)){
            d.fx = d.fx + event.dx;
            d.fy = d.fy + event.dy;
          }
          selectedNodes.forEach(node => {
            node.fx = node.fx + event.dx;
            node.fy = node.fy + event.dy;
          });
          ticked();
        }
  
        // Restore the target alpha so the simulation cools after dragging ends.
        // Unfix the subject position now that it’s no longer being dragged.
        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          if(!selectedNodes.includes(d)){
            d.fx = d.fx + event.dx;
            d.fy = d.fy + event.dy;
          }
          selectedNodes.forEach(node => {
            node.fx = node.fx + event.dx;
            node.fy = node.fy + event.dy;
          });
        }
  
  
        nodes.forEach(node => {
          node.fx = node.x;
          node.fy = node.y;
        });

          
          
        nodes.forEach(node => {
          node.fx = node.x;
          node.fy = node.y;
        });

          
        function label_ticked(){
          texts.attr('x', d => d.label_x)
          .attr('y', d => d.label_y)
        }

        function labelDragStarted(event, d) {
          if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
          d.label_x = d.label_x + event.dx;
          d.label_y = d.label_y + event.dy;
          label_ticked()
        }
      
        function labelDragging(event, d) {
          d.label_x = d.label_x + event.dx;
          d.label_y = d.label_y + event.dy;
          label_ticked()
        }
      
        function labelDragEnded(event, d) {
          if (!event.active) simulationRef.current.alphaTarget(0);
          d.label_x = d.label_x + event.dx;
          d.label_y = d.label_y + event.dy;
        }
  
      // };

      function updateBubbleSets(svg, nodes, existingCluster, color, opacity, strokeWidth, strokeColor, clusterNames) {
        const bubbles = new BubbleSet();
      
        const rectangles = nodes.map(node => ({
          x: node.x - parseInt(node.size) / 2,
          y: node.y - parseInt(node.size) / 2,
          width: parseInt(node.size),
          height: parseInt(node.size),
        }));
      
        const list = bubbles.createOutline(
          BubbleSet.addPadding(rectangles, 5),
          BubbleSet.addPadding(rectangles, 5),
          null
        );
      
        const outline = new PointPath(list).transform([
          new ShapeSimplifier(0.0),
          new BSplineShapeGenerator(),
          new ShapeSimplifier(0.0),
        ]);
      
        if (existingCluster) {
          existingCluster.attr("d", outline);
        } else {
          existingCluster = svg.append("path")
            .attr("d", outline)
            .attr("fill", color)
            .attr("fill-opacity", opacity)
            .attr("stroke", strokeColor)
            .attr("stroke-width", strokeWidth)
            .on("click", e=>handleClusterClick(e,clusterNames));
        }

      
        return existingCluster;
      }

      // const svgRect = SVG.node().getBoundingClientRect();
      // const chartRect = chartContainer.node().getBoundingClientRect();

      // if(transformState && transformState.current) {
      //   const transform = transformState.current;
      //   chartContainer.call(zoom.transform, transform);
      // } else {
      //   const relativeLeft = svgRect.left - chartRect.left;
      //   const relativeTop = svgRect.top - chartRect.top;
      //   const relativeRight = svgRect.right - chartRect.right;
      //   const relativeBottom = svgRect.bottom - chartRect.bottom;

      //   // console.log(neighbourData.time, innerWidth, innerHeight, relativeLeft, relativeRight, relativeTop, innerHeight, relativeBottom);
      //   const deltaX = relativeLeft - (innerWidth - svgRect.width) / 2;
      //   const deltaY = relativeTop - (innerHeight - svgRect.height) / 2;
      //   const transform = d3.zoomIdentity.translate(-deltaX, -deltaY).scale(1);
      //   chartContainer.call(zoom.transform, transform);
      //   transformState.current = transform;
      // }
  
      // d3.timeout(main);
  
      return () => {
        simulation.stop();
      };
    }
    
  }, [neighbourData, selectedNodes, selectedLinks, categories, clusterData, thumbnails, isBrush, fileterList, classes, linkClasses, posState, background]);

  // useEffectDebugger(() => {
  useEffect(() => {
    const chartContainer = d3.select(chartRef.current);

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const outerContainer = chartContainer
      .style('overflow', 'hidden')
      .style('width', '100%')
      .style('height', '100%')
      .call(zoom)
      .on("click", handleBgClink);

    if(isBrush) {
      chartContainer.on(".zoom", null);
    }
    
    if(preValue !== undefined && preValue.isBrush !== isBrush) return;
    chartContainer.selectAll('*').remove();
    // Create the SVG element within the outer container
    const svg = outerContainer
      .append('svg')
      .attr('id', 'SVG')
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g');
  
    if(data && data.nodes.length > 0 && (preValue === undefined || preValue.isBrush === isBrush)){      
      
      let transform = d3.zoomIdentity;

      if(transformState && transformState.current) {
        transform = transformState.current;
        chartContainer.call(zoom.transform, transform);
      } else {
        transform = d3.zoomIdentity.translate(margin.left, margin.top);
        chartContainer.call(zoom.transform, transform);
        transformState.current = transform;
      }

      const svgRect = svg.node().getBoundingClientRect();      
      const width = chartContainer.node().getBoundingClientRect().width;
      const height = chartContainer.node().getBoundingClientRect().height - 5;
      const innerWidth = width;
      const innerHeight = height;

      // if(transformState && transformState.current) {
      //   const transform = transformState.current;
      //   chartContainer.call(zoom.transform, transform);
      // } else {
      //   const transform = d3.zoomIdentity.translate(innerWidth / 2, innerHeight / 2).scale(1);
      //   chartContainer.call(zoom.transform, transform);
      //   transformState.current = transform;
      // }

      // The force simulation mutates links and nodes, so create a copy
      // so that re-evaluating this cell produces the same result.
      /*const allLinks = data.links;
      const allNodes = data.nodes.map(d => ({
        id: d, 
        label: d.replaceAll("_", " ")
      }));*/

      let _allNodes = [];

      if(freshGenerate && freshGenerate.current) {
        _allNodes = data.nodes.map(d => ({
          id: d, 
          label: d.replaceAll("_", " ")
        })).filter(node => isMain(node.label) || isSupporter(node.id));
      } else {
        for(const node of data.nodes){
          if(neighbourData){
            const index = neighbourData.nodes.findIndex(n => n.id === node);
            if(index === -1){
              _allNodes.push({
                id: node, 
                label: node.replaceAll("_", " ")
              });
            } else {
              _allNodes.push(neighbourData.nodes[index]);
            }
          } else if(!neighbourData) {
            _allNodes.push({
              id: node, 
              label: node.replaceAll("_", " ")
            });
          }
        }
      }

      const allNodes = _allNodes.filter(node => isMain(node.label) || isSupporter(node.id));

      const allLinks = data.links.filter(link => {
        if(isSupporter(link.source) && isSupporter(link.target)) {
          return true;
        }

        if(isMain(link.source) && isSupporter(link.target)) {
          return true;
        }

        if(isSupporter(link.source) && isMain(link.target)) {
          return true;
        }

        return false;
      });

      function isMain(node) {
        return mainCharacter !=undefined ?  mainCharacter.includes(node.replaceAll("_", " ")) : false;
      }

      function isSupporter(node) {
        return supporter!=undefined ? supporter.map(sup => sup.id).includes(node) : false;
      }

      const nodes = allNodes.map(node => {
        const is_delete = graphDelete.nodes.includes(node.id);
        const is_add = graphAdd.nodes.includes(node.id);
        const is_main = mainCharacter !=undefined ?  mainCharacter.includes(node.label) : false;
        const is_supporter = supporter!=undefined ? supporter.map(sup => sup.id).includes(node.id) : false;
        const is_highlight = highlight!=undefined ? highlight.map(hi => hi.id).includes(node.id) : false;
        /*const properties = {
          size: 4,
          color: '#1F77B4', // default color
          opacity: 1,
          fill_opacity: 0.7,
          thumbnail: '',
          custom_label: '',
          label_x: 0,
          label_y: -6
        };*/
        const properties = {
          size: (node.size)? node.size : 7,
          color: (node.color)? node.color : 'white',
          stroke: (node.stroke)? node.stroke : "#b1b1b1",
          stroke_width: (node.stroke_width)? node.stroke_width : 2,
          opacity: (node.opacity)? node.opacity : 1,
          fill_opacity: (node.fill_opacity)? node.fill_opacity : 1,
          thumbnail: (node.thumbnail)? node.thumbnail : '',
          custom_label: (node.custom_label)? node.custom_label : '',
          label_x: (node.label_x)? node.label_x : 0,
          label_y: (node.label_y)? node.label_y : -6
        };

        if(is_main) {
          // properties.color = 'red';
          delete node.stroke;
          properties.stroke = color.main;
          delete node.stroke_width;
          properties.stroke_width = 6;
          delete node.custom_label;
          properties.custom_label = node.label;
        } 
        else if(is_highlight) {
          // properties.color = '#9467bdff';
          delete node.stroke;
          properties.stroke = color.support;
          delete node.stroke_width;
          properties.stroke_width = 6;
          delete node.custom_label;
          properties.custom_label = node.label;
        } else {
          properties.stroke = "#b1b1b1";
          properties.stroke_width = 2;
          properties.custom_label = '';
        }
        if(is_add) {
          // properties.filter = 'url(#neon-FFBB00)';
          delete node.filter;
          properties.filter = 'url(#neon-F28E2B)';
        }

        if(is_delete) {
          // properties.fill_opacity = 0.0;
          delete node["stroke-dasharray"];
          properties["stroke-dasharray"] = "1,1";
        }
        /*else if(is_supporter) {
          properties.color = '#9467bdff';
          properties.custom_label = node.label;
        } 
        else {
          properties.opacity = 0.1;
        }*/

        return {
          ...node,
          ...properties,
        };
      });

      const maxNum = Math.max(...allLinks.map(link => link.value));
      const weightedSize = (size) => {
        // const num = 1 + size/maxNum * 3;
        // return (Math.ceil(num * 10) / 10).toFixed(1);
        return 1.5;
      }

      const links = allLinks.map(link => {
        const is_delete = graphDelete.links.some((edge) => {
          if(edge.source === link.source && edge.target === link.target) {
            return true;
          }
          if(!edge.is_directed) {
            return edge.target === link.source && edge.source === link.target;
          }
        });

        const is_add = graphAdd.links.some((edge) => {
          if(edge.source === link.source && edge.target === link.target) {
            return true;
          }
          if(!edge.is_directed) {
            return edge.target === link.source && edge.source === link.target;
          }
        });

        // const properties = {
        //   size: 1,
        //   color: '#1F77B4', // default color
        //   opacity: 0.6,
        //   marker: 'M0,-5L10,0L0,5',      
        //   custom_class: ''    
        // };

        const properties = {
          size: weightedSize(link.value),
          color: '#b1b1b1', // default color
          opacity: 1,
          marker: 'M0,-5L10,0L0,5',
          viewBox: '0 -5 10 10',
          custom_class: ''    
        };

        if(is_delete) {
          properties["stroke-dasharray"] = "1,1";
        }

        if(is_add) {
          properties.filter = 'url(#neon-F28E2B)';
        }

/*        const res = {
            ...link,
            ...properties,
        };

        if(isSupporter(link.source) && isSupporter(link.target)) {
          return res;
        }

        if(isMain(link.source) && isSupporter(link.target)) {
          return res;
        }

        if(isSupporter(link.source) && isMain(link.target)) {
          return res;
        }

        properties.opacity = 0.1;*/
        
        return {
          ...link,
          ...properties,
      }});

      setNeighbourData({time: data.time, nodes, links })
  
    }

  }, [data, graphAdd, graphDelete, mainCharacter, supporter, isBrush, highlight]
    // ["data", "graphAdd", "graphDelete", "mainCharacter", "supporter", "isBrush", "highlight", "color"]
    );

    // useEffect(() => {
    //   if(!neighbourData.background) return;
    //   const chartContainer = d3.select(chartRef.current);
    //   const SVG = chartContainer.select('#SVG').select('g');
      
    //   const svg = SVG.append('g');

    //   svg.append('image')
    //     .attr("pointer-events", "none")
    //     .attr('xlink:href', neighbourData.background);

    // }, [neighbourData.background]);

    useEffect(() => {
      if (neighbourData) {
        let updatedNodes = neighbourData.nodes;
        updatedNodes = updatedNodes.map((node) => {
          const is_main = mainCharacter?.includes(node.label);
          const is_highlight = highlight?.some(hi => hi.id === node.id);
          if(is_main) node.stroke = color.main;
          if(is_highlight) node.stroke = color.support;
          return node
        });
    
        setNeighbourData({...neighbourData, nodes: updatedNodes});
      }
    }, [color]);

  return <div ref={chartRef} style={{ flex: 1, position: 'relative' }} />;
});

export default StaticGraph;