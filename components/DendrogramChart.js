import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { axisBottom, axisLeft } from 'd3-axis';
import { schemeTableau10 } from 'd3-scale-chromatic';
import styles from '../styles/DendrogramChart.module.css'
import temp_data from '../data/hierarchy_data.json';
import { SERVER_ENDPOINT } from "../constants";
import { getGraph } from '../api/graph';
import { Color } from '../api/color';

let temGroup = [];
let childGroup = [];
let colorGroup = [];
let colorCheck = new Color();
let currentY = 0;
let prevNode = null;

export const getChosenTimeStamp = () => {
  return prevNode;
}

const DendrogramChart = ({ 
                          data_name,
                          curPos,
                          setCurrentGraphId, 
                          setChildGroup, 
                          mainCharacter, 
                          setColorGroup,
                          setCurrentGroup, 
                          setMainCharacter, 
                          character,
                          mode,
                          setMode,
                          setReplacement,
                          setSelectedTime,
                          title,
                          from,
                          to,
                          freshGenerate,
                          setGraphList,
                          isLoading,
                          setIsLoading,
                         }) => {
  const chartRef = useRef(null);
  const brushRef = useRef(null);
  const svgRef = useRef(null);
  const [chartRendered, setChartRendered] = useState(true);
  const [data, setData] = useState(temp_data);

  useEffect(() => {
    function resetBrush() {
      svgRef.current.call(brushRef.current.move, null);

      d3.select(chartRef.current).selectAll("g").select("circle")
        .style("stroke", "#7D7463");
      d3.select(chartRef.current).selectAll("path")
        .style("stroke", "#7D7463");
    }
  
    window.addEventListener("resetBrush", resetBrush);
    return () => {
      window.removeEventListener("resetBrush", resetBrush);
    };
  }, []);
  

  useEffect(() => {
    async function getData() {
      let filter = '';
      if(from) {
        filter = `from=${from}`;
      }
      if(to) {
        filter = filter + `&to=${to}`;
      }
      let url = `/api/hierarchy?data_name=${data_name}&${filter}`;

      if(character !== null) {
        url = `/api/main-character?data_name=${data_name}&type=${mode}&character=${character.replace(/_/g," ")}&${filter}`;
      }

      fetch(url).then(response => response.json()).then(hierarchy => {
        setData({children: [hierarchy], "name": "Root"});
        setChartRendered(false);
        setIsLoading(false);
      });
      
      setIsLoading(true);
    }
    getData();
  }, [character, mode]);

  useEffect(() => {
    if (!chartRendered) {
      const chartContainer = d3.select(chartRef.current);
      if(!curPos.current) {
        curPos.current = {
          width: chartContainer.node().getBoundingClientRect().width,
          height: chartContainer.node().getBoundingClientRect().height - 5
        }
      }
      const width = curPos.current.width;
      const height = curPos.current.height;
      // NEXT.js 는 SSR 이기에 렌더링 전에 값을 확인하고 이로 인해 px 차이 발생 정확한 원인은 모르겠으나 전후로 5px 차이가 남
      const circleRadius = 7;

      chartContainer.selectAll('*').remove();

      const margin = { top: 10, right: 60, bottom: 40, left: 50 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(chartRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const cluster = d3.cluster()
        .size([innerWidth, innerHeight]);

    const root = d3.hierarchy(data, d => d.children);
    cluster(root);
    const leaves = root.descendants().filter(d => !d.children); // Filter only the leaf nodes
    const non_leaves = root.descendants().filter(d => d.children);

    const minTime = d3.min(leaves, d => d.data.time);
    const maxTime = d3.max(leaves, d => d.data.time);

    // if(character !== null) {
    //   console.log("WHY?");
    //   for(let i = minTime; i <= maxTime; i++) {
    //     mainCharacter[i] = [character.replaceAll("_", " ")];
    //   }
    //   setMainCharacter({...mainCharacter});
    // }

    const maxDistane = d3.max(non_leaves, d => d.data.distance);

    const xOffset = (circleRadius + 3) / innerWidth * leaves.length;
    const yOffset = (circleRadius + 3) / innerHeight * maxDistane;

    const xDomain = [minTime - xOffset, maxTime + xOffset];
    const xRange = [0, innerWidth];

    const yDomain = [-yOffset, maxDistane + yOffset];
    const yRange = [innerHeight, 0];

    const xScale = d3.scaleLinear()
        .domain(xDomain)
        .range(xRange);

    const yScale = d3.scaleLinear()
        .domain(yDomain)
        .range(yRange);

    const yScaleInverse = d3.scaleLinear()
        .domain(yRange)
        .range(yDomain);

    // const linkGenerator = d3.linkVertical()
    //   .x(d => d.x)
    //   .y(d => d.y);
    const linkGenerator = (d) => {
        if(d.source.parent !== null){
        const sourceX = xScale(d.source.data.time);
        const sourceY = yScale(d.source.data.distance);
        const targetX = xScale(d.target.data.time);
        const targetY = yScale(d.target.data.distance);

        return (
          'M' + sourceX + ',' + sourceY +
          'V' + sourceY +
          'H' + targetX +
          'V' + targetY
        )
        }
      };

    svg.selectAll('path')
        .data(root.links())
        .join('path')
        .attr('d', linkGenerator)
        .style('fill', 'none')
        .attr('stroke', '#7D7463')
				.attr('stroke-width', 2);

    svg.selectAll('g')
        // .data(root.descendants())
        .data(leaves)
        .join('g')
        // .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('transform', d => `translate(${xScale(d.data.time)},${yScale(d.data.distance)})`)
        .append('circle')
        .attr('r', circleRadius)
        .style('fill', 'white')
        .attr('stroke', '#7D7463')
        .attr('value', d => d.data.time)
        .style('stroke-width', 5)
        .on("click", async (e, d) => {
          // const graph = await getGraph(d.data.time);
          // setCurrentGraphId(`${d.data.time}`);
          // e.target.style.fill = "red";
          // if(prevNode !== null) {
          //   prevNode.style.fill = "white";
          // }
          // prevNode = e.target;
        });
        
    // Create x and y axes
    const xAxisTicks = xScale.ticks()
        .filter(tick => Number.isInteger(tick));
    const xAxis = axisBottom(xScale)
        .tickValues(xAxisTicks)
        .tickFormat(d3.format('d'));; 
    const yAxis = axisLeft(yScale);
    
    // Append x and y axes to the SVG
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll('text') // Select all tick labels
        .style('font-size', '0.7rem'); // Adjust the font size as desired
        
    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text') // Select all tick labels
        .style('font-size', '0.7rem');

		// Append Criteria
		// Add a rectangle with the drag area buffer for easy operation 
		svg.append("rect")
				.attr("class", `${styles.criteria_rect}`)
				.attr("id", "CriteriaRect")
				.attr("x", 0)
				.attr("y", -5)
				.attr("width", width - margin.right - margin.left)
				.attr("height", 10 )
				.attr("fill", "#0000")
				.call(d3.drag() 
						.on("drag", handleDragged)
            .on("end", handleDragEnd));

		// Append Criteria Deshed Line
		svg.append("line")
				.attr("class", `${styles.criteria_line}`)
				.attr("id", "CriteriaLine")
				.attr("x1", 0)
				.attr("y1", 0)
				.attr("x2", width - margin.right - margin.left)
				.attr("y2", 0 )
				.attr("stroke", "#000")

    svg.append("path")
				.attr("d", d3.symbol().type(d3.symbolTriangle).size(100))
				.attr("id", "CriteriaTri")
				.attr("fill", "#000")
				.attr("x", width - margin.right - margin.left + 25)
				.attr("y", 6)
				.attr("transform", `translate(${width - margin.right - margin.left + 15}, 0) rotate(${-90})`)
				.call(d3.drag() 
						.on("drag", handleDragged)
            .on("end", handleDragEnd));

		svg.append("text")
				.attr("class", `${styles.criteria_label}`)
				.attr("id", "CriteriaLabel")
				.attr("x", width - margin.right - margin.left + 25)
				.attr("y", 6)
				.attr("style", "font-size:18px !important")
				.text(0);

        // TEMP: Disable brushing
		// Add brushing
		// svg.append('g')
		// 		.call( d3.brush()                 
		// 		.extent( [ [0,0], [innerWidth,innerHeight] ] ) 
		// 		.on("start end", handleBrush)
		// 	)
    brushRef.current = d3.brush()
    .extent([[0,0], [innerWidth, innerHeight]])
    .on("start brush end", handleBrush);

    svgRef.current = svg.append('g');
    
    svgRef.current.call(brushRef.current);

		// d3.select(chartRef.current).append("button")
		// 	.attr("class", `${styles.generat_button}`)
		// 	.html("generate")
		// 	.on("click", ()=>{
		// 		setCurrentGroup(temGroup);
    //     setChildGroup(childGroup);
    //     // setReplacement([]);
		// 	});

      // const mode = d3.select(chartRef.current).append("select")
      //                                         .attr("class", `${styles.mode_button}`);
      // mode.append("option").attr("value", "ego").text("ego mode");
			// mode.append("option").attr("value", "neighbor").text("neighbor mode");
      // mode.append("option").attr("value", "community").text("community mode");

      // mode.on("change", function(e) {
      //   setMode(d3.select(this).property('value'));
      // });
		
    setChartRendered(true);

		function handleBrush(e) {
			if(e == null || e.selection == null) return; // if selected area is empty, return

			let x0 = e.selection[0][0],
					x1 = e.selection[1][0],
					y0 = e.selection[0][1],
					y1 = e.selection[1][1];

			// Nodes that in selected area
			const selectedNodes = root.descendants().filter(node => x0 <= xScale(node.data.time) && xScale(node.data.time) <= x1 && y0 <= yScale(node.data.distance) && yScale(node.data.distance) <= y1);
			const selectedList = selectedNodes.map(node => node.data.name);
      const sortedList = selectedList.sort((a, b) => parseInt(a) - parseInt(b));
      const joinedString = sortedList.join('-');
      setSelectedTime(joinedString);
      const baseNodes = root.descendants().filter(node => yScale(node.data.distance) > currentY); // e.y 보다 yScale 이 큰 node 
      const colorScale = d3.scaleOrdinal(schemeTableau10).domain(baseNodes.map(node => node.data.name));
			let farthestAncestors = [];
      const clusters = new Set();

      svg.selectAll("g")
         .select("circle")
         .each(node => {
            const farthestAncestor = node.ancestors().reduce((farthest, ancestor) => {
              if( baseNodes.includes(ancestor) ) return (farthest && farthest.data.distance > ancestor.data.distance ) ? farthest : ancestor;
              else return farthest
            }, null);
            if (farthestAncestor) {
							farthestAncestors.push(farthestAncestor);
              clusters.add(farthestAncestor.data.name);
              return colorCheck.getColor(farthestAncestor.data.name);
						}
         });

      colorCheck.setN(clusters.size);

      svg.selectAll("g")
					.select("circle")
					.style("stroke", node => {
            // Set the farthest based node from node as the farthestAncestor
						const farthestAncestor = node.ancestors().reduce((farthest, ancestor) => {
							if( baseNodes.includes(ancestor) ) return (farthest && farthest.data.distance > ancestor.data.distance ) ? farthest : ancestor;
							else return farthest
						}, null);
						
						if (farthestAncestor) {
              colorCheck.addElement(farthestAncestor.data.name);
              if (selectedNodes.includes(node)) return "blueviolet";
              return colorCheck.getColor(farthestAncestor.data.name);
						}
						return "#7D7463";
					});

			svg.selectAll("path")
					.data(root.links())
					.style("stroke", link => {
						// if (selectedNodes.includes(link.target) && selectedNodes.includes(link.source) ) return "blueviolet"
						const closestTargetAncestor = link.target.ancestors().find(ancestor => farthestAncestors.includes(ancestor));
            if (closestTargetAncestor ) return colorCheck.getColor(closestTargetAncestor.data.name);
            else return "#7D7463";
					});
		}


		function handleDragged(e, d) {		
			if(e.y > -5 && e.y < innerHeight) {
        currentY = e.y;
				d3.select("#CriteriaRect").raise().attr("y", e.y-5);
				d3.select("#CriteriaLine").raise().attr("y1", e.y).attr("y2", e.y);
				d3.select("#CriteriaTri").raise().attr("transform", `translate(${width - margin.right - margin.left + 15}, ${e.y}) rotate(${-90})`)

				const baseNodes = root.descendants().filter(node => yScale(node.data.distance) > e.y); // e.y 보다 yScale 이 큰 node 
				const colorScale = d3.scaleOrdinal(schemeTableau10).domain(baseNodes.map(node => node.data.name));
			
				let farthestAncestors = [];
        const clusters = new Set();

        svg.selectAll("g")
         .select("circle")
         .each(node => {
            const farthestAncestor = node.ancestors().reduce((farthest, ancestor) => {
              if( baseNodes.includes(ancestor) ) return (farthest && farthest.data.distance > ancestor.data.distance ) ? farthest : ancestor;
              else return farthest
            }, null);
            if (farthestAncestor) {
							farthestAncestors.push(farthestAncestor);
              clusters.add(farthestAncestor.data.name);
						}
         });

      colorCheck.setN(clusters.size);

				svg.selectAll("g")
					.select("circle")
					.style("stroke", node => {
						// Set the farthest based node from node as the farthestAncestor
						const farthestAncestor = node.ancestors().reduce((farthest, ancestor) => {
							if( baseNodes.includes(ancestor) ) return (farthest && farthest.data.distance > ancestor.data.distance ) ? farthest : ancestor;
							else return farthest
						}, null);
						
						if (farthestAncestor) {
              colorCheck.addElement(farthestAncestor.data.name);
							return colorCheck.getColor(farthestAncestor.data.name);
						}
						return "#7D7463";
					});

        d3.select("#CriteriaLabel").raise().attr("y", e.y + 6).text(clusters.size);
			
				svg.selectAll("path")
					.data(root.links())
						.style("stroke", link => {
							const closestTargetAncestor = link.target.ancestors().find(ancestor => farthestAncestors.includes(ancestor));
							if (closestTargetAncestor ) return colorCheck.getColor(closestTargetAncestor.data.name);
							else return "#7D7463";
						});
			}
		}

    function handleDragEnd(e, d) {
      if (e.y > -5 && e.y < innerHeight) {
        currentY = e.y;
        const baseNodes = root.descendants().filter(node => yScale(node.data.distance) > e.y);
    
        const clusters = new Set();
        const childClusters = {};  // To keep track of one level below nodes        
    
        svg.selectAll("g")
          .select("circle")
          .each(function(node) {
            const farthestAncestor = node.ancestors().reduce((farthest, ancestor) => {
              if (baseNodes.includes(ancestor)) return (farthest && farthest.data.distance > ancestor.data.distance) ? farthest : ancestor;
              else return farthest;
            }, null);
    
            if (farthestAncestor) {
              clusters.add(farthestAncestor.data.name);
              
              // Add children of the farthest ancestor to childClusters
              const subgraph = [];
              if (farthestAncestor.children) {
                farthestAncestor.children.forEach(child => {
                  subgraph.push(child.data.name);
                  // childClusters.add(child.data.name);
                });
                childClusters[farthestAncestor.data.name] = subgraph;
              }
            }
          });
    
        const clusterArray = Array.from(clusters);
        clusterArray.sort((a, b) => parseInt(a.split("-")[0]) - parseInt(b.split("-")[0]));
    
        // const childClusterArray = Array.from(childClusters); // Array of one level below nodes
        // childClusterArray.sort((a, b) => parseInt(a.split("-")[0]) - parseInt(b.split("-")[0]));
    
        temGroup = clusterArray; 
        childGroup = childClusters;
        colorGroup = clusterArray.map(cluster => colorCheck.getColor(cluster));
      }
    }
		

    }
  }, [chartRendered]);
  
  // return <div ref={chartRef} style={{ flex: 1, position: 'relative' }} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 1rem 0 1rem', 
    alignItem: 'center'}}>
      <div>
        <select
            className={styles.select}
            onChange={(e) => setMode(e.target.value)}
            defaultValue={mode}
        >
          <option value="ego">Level 1.0</option>
          <option value="neighbor">Level 1.5</option>
        </select>
      </div>
      <div style={{fontSize: "0.8rem", justifyContent: "center", padding: "0.3rem 1rem"}}>
        {title ? title.replaceAll("_", " ") : ""}
      </div>
      <div>
        <button 
            className={`${styles.gen_button}`} 
            onClick={() => {
              // Clear the canvas?
              setGraphList([]);
              setColorGroup([...colorGroup]);
              setCurrentGroup([...temGroup]);
              setChildGroup({...childGroup});
              setIsLoading(true);
            }}>
          GENERATE
        </button>
      </div>
    </div>
      <div ref={chartRef} style={{ flex: 1, position: 'relative' }} />
    </div>
  );
};

export default DendrogramChart;
