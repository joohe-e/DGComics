import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getPart, getSankey } from '../api/graph';
import { scaleSequential } from 'd3-scale';
import { interpolateBuPu } from 'd3-scale-chromatic';
import styles from '../styles/DendrogramChart.module.css'

const SankeyChart = ({
                      data_name, 
                      nodeIdsToConnect, 
                      setNodeIdsToConnect,
                      clusters, 
                      setClusters, 
                      allNodes, 
                      categoryList,
                      mode,
                      setMode,
                      from, 
                      to,
                      setSelectedSankey 
                    }) => {
  const ref = useRef(null);
  const legendRef = useRef(null);
  const [data, setData] = useState(null);
  const [partitionList, setPartitionList] = useState({});
  const [selectedCom, setSelectedCom] = useState([]);
  const buttonRef = useRef(null);
  // const [nodeIdsToConnect, setNodeIdsToConnect] = useState([]);

  /*function sendClusters() {
    setClusters(selectedCom);
  };*/

  useEffect(() => {
    // Assuming getSankey() function fetches your data
    getSankey(data_name, mode, allNodes.current, from, to).then((fetchedData) => {
      setData(fetchedData);
    });
  }, [mode]);

  useEffect(() => {
    const chartContainer = d3.select(ref.current);
    const legendContainer = d3.select(legendRef.current);
    if (data) {
      const _counts = {};
      data.nodes.forEach((node) => {
        const year = node.id.split('-')[0];
        if (!_counts[year]) {
          _counts[year] = 0;
        }
        _counts[year]++;
      });
      const maxIdNumber = Math.max(...Object.values(_counts));
      const maxYear = Math.max(...data.nodes.map(d => +d.id.split('-')[0]));
      const minYear = Math.min(...data.nodes.map(d => +d.id.split('-')[0]));
      const maxValue = d3.max(data.nodes, d => d.value);

      const remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
      // const circleRadius =  remInPixels * 0.35;
      const padding = remInPixels * 0.15; // Padding between circles
      // const squareWidth = (2 * circleRadius) + padding;
      // const squareHeight = (2 * circleRadius) + padding;

      // const width = (squareWidth * (maxYear - minYear + 1));
      // const height = (squareHeight * (maxIdNumber + 1));
      const margin = { top: 40, right: 30, bottom: 20, left: 30 };
      // const fullWidth = (squareWidth * (maxYear - minYear + 1)) + margin.left + margin.right ;
      // const fullHeight = (squareHeight * (maxIdNumber + 1)) + margin.top + margin.bottom;
      const fullWidth = chartContainer.node().getBoundingClientRect().width - 20;
      const fullHeight = chartContainer.node().getBoundingClientRect().height - 20;
      const width = fullWidth - margin.left - margin.right;
      const height = fullHeight - margin.top - margin.bottom;
      const squareWidth = width / (maxYear - minYear + 1);
      const squareHeight = height / (maxIdNumber + 1);
      const circleRadius =  Math.min(squareWidth, squareHeight) * 0.4;
      // const margin = { top: 50, right: 20, bottom: 20, left: 20 };

      chartContainer.selectAll("*").remove();
      legendContainer.selectAll("*").remove();

/*      function clicked(e, d) {
        
        const target = d3.select(e.target);
        const isSelected = target.attr("selected") === "true";
        
        const newSelectedState = !isSelected;
        const strokeWidth = newSelectedState ? 1 : 0;
        
        target.attr("stroke-width", strokeWidth)
              .attr("selected", newSelectedState);
      
        setSelectedCom((prevSelectedCom) => {
          let updatedList;
          if (newSelectedState) {
            const matchingPathObj = nodeIdsToConnect.find(obj => obj.nodeIds.includes(d.id));
            const color = matchingPathObj ? matchingPathObj.color : '#000000';
            updatedList = [...prevSelectedCom, { time: d.id.split('-')[0], id: d.id, color: color }];
          } else {
            updatedList = prevSelectedCom.filter(item => {
              if (item.id !== d.id) {
                return { time: item.id.split('-')[0], id: item.id, color: item.color };
              }
              return null;
            });
          }
          return updatedList;
        });
              
      }*/
      function clicked(e, d) {
        const target = d3.select(e.target);
        const isNodeInCluster = clusters.some(cluster => cluster.id === d.id);
        const newSelectedState = !isNodeInCluster;
        const strokeWidth = newSelectedState ? 1 : 0;
        
        target.attr("stroke-width", strokeWidth)
              .attr("selected", newSelectedState);

        setClusters(()=>{
          let updatedClusters;
          if (newSelectedState) {
              const matchingPathObj = nodeIdsToConnect.find(obj => obj.nodeIds.includes(d.id));
              const color = matchingPathObj ? matchingPathObj.color : "#e66465";
              updatedClusters = [...clusters, { time: d.id.split('-')[0], id: d.id, color: color }];
          } else {
              updatedClusters = clusters.filter(cluster => cluster.id !== d.id);
          }
          return updatedClusters;
        });
      }
      
      function included(node) {
        return clusters.some(cluster => cluster.id === node);
      }
    
      const groupedByYear = {};
      for(let year = minYear; year <= maxYear; year++) {
        groupedByYear[year] = [];
      }
      data.nodes.forEach((node) => {
        const year = +node.id.split('-')[0];
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(node);
      });
      
      let sortedNodes = [];
      Object.keys(groupedByYear).forEach((year) => {
        const sortedGroup = groupedByYear[year].sort((a, b) => b.value - a.value);
        sortedGroup.forEach((node, index) => {
          node.sortedIndex = index;
        });
        sortedNodes = sortedNodes.concat(sortedGroup);
      });

      const svg = chartContainer
        .append('svg')
        .attr('width', fullWidth)
        .attr('height', fullHeight)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // const squareWidth = width / (maxYear - minYear + 1);
      // const squareHeight = height / (maxIdNumber + 1);

      const dataWidth = squareWidth * 0.9;
      const dataHeight = squareHeight * 0.9;

      const xOffset = (width / (maxYear - minYear + 1) - dataWidth) / 2;
      const yOffset = (height / (maxIdNumber + 1) - dataHeight) / 2;

      const pathGroup = svg.append("g").attr("class", "paths");
      const circleGroup = svg.append("g").attr("class", "circles");

      const customInterpolator = (value) => {
        return interpolateBuPu(0.2 + value*0.8);  // Starts from the midpoint (0.5) of BuPu
      };
      const colorScale = scaleSequential(customInterpolator).domain([0, maxValue]);

      // Custom Grid Lines to match the squares
      for (let i = 0; i <= maxYear - minYear; i++) {
        svg.append("line")
          .attr("x1", squareWidth * i)
          .attr("y1", 0)
          .attr("x2", squareWidth * i)
          .attr("y2", height)
          .attr("stroke", "#ddd");  // Grid line color
      }

      for (let j = 0; j <= maxIdNumber; j++) {
        svg.append("line")
          .attr("x1", 0)
          .attr("y1", squareHeight * j)
          .attr("x2", width)
          .attr("y2", squareHeight * j)
          .attr("stroke", "#ddd");  // Grid line color
      }

      // Add a thicker line for the rightmost grid line
      svg.append("line")
        .attr("x1", width)
        .attr("y1", 0)
        .attr("x2", width)
        .attr("y2", height)
        .attr("stroke", "#ddd");

      // Add a thicker line for the bottommost grid line
      svg.append("line")
        .attr("x1", 0)
        .attr("y1", height)
        .attr("x2", width)
        .attr("y2", height)
        .attr("stroke", "#ddd");


        Object.keys(groupedByYear).forEach((year, index) => {
          // Add year text label
          const lineStartX = (index + 1) * squareWidth - squareWidth / 2 + remInPixels / 2;
          // Add year text label
          let text = svg.append("text")
          .style("font-size", '0.7rem')
          .style("font-family", "Roboto")
          .style("fill", "#3c4043")
          .attr("x", lineStartX)  // Adjusted for moving to the right by half square width
          .attr("y", 0)  // Position within the top margin
          .attr("text-anchor", "start")
          .attr("transform", `rotate(-60, ${(index + 1) * squareWidth - squareWidth / 2}, ${0})`)
          .text(year);
    
          // Calculate approximate text width
          let approximateTextWidth = text.node().getBBox().width;
          const lineEndX = lineStartX + approximateTextWidth;  // Adjusted for moving to the right by half square width
          const lineStartY = remInPixels / 6;
          const lineEndY = remInPixels / 6;

          svg.append("line")
              .attr("x1", lineStartX)
              .attr("y1", lineStartY)
              .attr("x2", lineEndX)
              .attr("y2", lineEndY)
              .attr("transform", `rotate(-60, ${(index + 1) * squareWidth - squareWidth / 2}, ${0})`)
              .attr("stroke", "#ddd")
              .attr("stroke-linecap", "round")
              .attr("stroke-width", 2);
        });

      //const circleRadius = Math.min(squareWidth, squareHeight) * 0.4;
      const circles = circleGroup.selectAll(".circle")
        .data(sortedNodes)  // Use the sorted nodes here
        .enter().append("circle")
        .attr("class", "circle")
        .attr("cx", d => (d.id.split('-')[0] - minYear) * squareWidth + squareWidth / 2)
        .attr("cy", d => d.sortedIndex * squareHeight + squareHeight / 2)
        .attr("r", circleRadius)
        .attr("stroke", "black")
        .attr("stroke-width", d => included(d.id) ? 1 : 0)
        // .attr("selected", d => d.selected)
        .on("click", clicked)
        .style("fill", d => colorScale(d.value));

      circles.append("title")
        .text(d => d.id);

      //const nodeIdsToConnect = ["1991-1", "1997-4", "1998-3", "1999-12", "2000-0", "2001-3", "2018-1", "2019-2", "2020-3"];

      // Create a path element
      const path = d3.path();

      const paths = []; // Array to store path elements

      if (nodeIdsToConnect.length > 0) {
        nodeIdsToConnect.forEach(({nodeIds, color}, listIndex) => {
          const path = d3.path();
          nodeIds.forEach((id, index) => {
            const node = data.nodes.find(d => d.id === id);
            if (node) {
              const x = (node.id.split('-')[0] - minYear) * squareWidth + squareWidth / 2;
              const y = node.sortedIndex * squareHeight + squareHeight / 2;
        
              if (index === 0) {
                path.moveTo(x, y);
              } else {
                path.lineTo(x, y);
              }
            }
          });
          paths.push({
            path,
            color
          });
        });
      
        pathGroup.selectAll(".custom-path").remove();
        // const concatenatedList = [].concat(...nodeIdsToConnect);
        const concatenatedList = nodeIdsToConnect.flatMap(obj => obj.nodeIds);
        paths.forEach(({path, color}, index) => {
          pathGroup.append("path")
            .attr("class", "custom-path")
            .attr("d", path.toString())
            .attr("stroke", color)
            .attr("stroke-width", circleRadius * 2)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("opacity", 0.5)
            .attr("fill", "none");
        });
          // Update the circles' opacity and raise them to the front
          circleGroup.selectAll(".circle")
            .attr("opacity", d => (concatenatedList.includes(d.id) || included(d.id) ? 1 : 0.3))
            .select("title")
            .text(d => d.id)
            .each(function () {
              if (concatenatedList.includes(d3.select(this.parentNode).datum().id)) {
                this.parentNode.parentNode.appendChild(this.parentNode);
              }
            });
      } else {
        // If nodeIdsToConnectLists is empty, reset opacity and update title
        circleGroup.selectAll(".circle")
          .attr("opacity", 1)
          .select("title")
          .text(d => d.id);
      
        // Remove all paths if no IDs to connect
        pathGroup.selectAll(".custom-path").remove();
      }

      const outerWidth = chartContainer.node().getBoundingClientRect().width / 3;
      const legendWidth = chartContainer.node().getBoundingClientRect().width / 4;
      const outerHeight = remInPixels * 1.5;
      const legendHeight = remInPixels * 0.7;
      const legendX = remInPixels * 0.1;  // Adjusted position
      const legendY = remInPixels * 0.1;  // Adjusted position

      // Create a group element for the legend
      const legend = legendContainer
          .append('svg')
          .attr('width', outerWidth)
          .attr('height', outerHeight)
          .attr('align', 'right')
          .append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${legendX},${legendY})`);

      // Create a linear gradient for the legend colors
      const gradientId = "legendGradient";
      svg.append("defs")
          .append("linearGradient")
          .attr("id", gradientId)
          .selectAll("stop")
          .data(colorScale.ticks().map((t, i, n) => ({
              offset: `${100 * i / n.length}%`,
              color: colorScale(t)
          })))
          .enter().append("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);

      // Create a rectangle filled with the gradient
      legend.append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", `url(#${gradientId})`);

      // Create a scale for the legend axis
      const legendScale = d3.scaleLinear()
          .domain([0, maxValue])
          .range([0, legendWidth]);

      // Create an axis for the legend
      const legendAxis = d3.axisBottom(legendScale)
          .ticks(5)  // Adjust number of ticks
          .tickSize(legendHeight);

      // Append the legend axis to the legend group
      legend.append("g")
          .attr("class", "legendAxis")
          .call(legendAxis)
          .select(".domain")
          .remove();

      }
  }, [data, nodeIdsToConnect, clusters]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative'}}>
  
      {/* New Row Container */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: "0.3rem 0 0 0.3rem"}}>
  
        {/* Button */}
        <div style={{flex: 1, padding: "0 0 0.5rem 0.5rem"}}>
          <button
            className={styles.gen_button}
            onClick={() => { setClusters([]) }}
            style={{
              marginRight: "0.5rem",
              fontSize: "0.6vw",
            }}
          >
            RESET SELECTION
          </button>

          <button
            className={styles.gen_button}
            onClick={() => { 
              setNodeIdsToConnect([]);
              setSelectedSankey({}) }}
              style={{
                marginRight: "0.5rem",
                fontSize: "0.6vw",
              }}
          >
            RESET PATH
          </button>

          <select
              className={styles.select}
              onChange={(e) => setMode(e.target.value)}
              defaultValue={mode}
              style={{
                marginRight: "0.5rem",
                fontSize: "0.6vw",
              }}
          >
            <option value="louvain">Louvain</option>
            {categoryList.map((category, index) => {
              return (
                <option key={index} value={category}>{category}</option>
              );
            })}
          </select>
          <span ref={legendRef} style={{
            position: "absolute",
            right: 0,
          }}/>
        </div>
  
      </div>
  
      {/* Ref Container (with auto overflow) */}
      <div ref={ref} style={{ flex: 1, overflow: 'auto' }} />
      {/* paddingTop is added to ensure the content below doesn't overlap with the new row container. Adjust as needed. */}
  
    </div>
  );
  


};

export default SankeyChart;
