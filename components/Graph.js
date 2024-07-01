import React, { useEffect, useRef } from 'react';
import styles from '../styles/Graph.module.css';
import * as d3 from 'd3';

const Graph = ({ pauseGraphRender, data, staticMode, selectedNodeId }) => {
  const chartRef = useRef(null);
  const svgRef = useRef(null);
  const nodeRef = useRef(null);
  const linkRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    const chartContainer = d3.select(chartRef.current);
    const width = chartContainer.node().getBoundingClientRect().width;
    const height = chartContainer.node().getBoundingClientRect().height - 5;

    chartContainer.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const circleRadius = 4;

    const outerContainer = chartContainer
      .style('overflow', 'hidden')
      .style('width', '100%')
      .style('height', '100%')
      .call(d3.zoom().on('zoom', zoomed));

    // Create the SVG element within the outer container
    const svg = outerContainer
      .append('svg')
      .attr('width', (staticMode)? '100%' : width)
      .attr('height', (staticMode)? '100%' : height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    // Specify the color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // The force simulation mutates links and nodes, so create a copy
    // so that re-evaluating this cell produces the same result.
    const links = data.links.map(d => ({ ...d }));
    const nodes = data.nodes.map(d => ({ ...d }));
    // Create a simulation with several forces.
    const simulation = d3.forceSimulation(nodes)
      // .stop()
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .alphaDecay(0.05)
      ;

    if(!staticMode) {
      const toogle = d3.select("#toggleGraphRender");
      if(toogle.node().textContent === "Resume") {
        simulation.stop();
      } else {
        simulation.restart();
      }
      toogle.on("click", (e) => {
        if (e.target.textContent === "Resume") {
          e.target.textContent = "Pause";
          simulation.restart();
        } else {
          e.target.textContent = "Resume";
          simulation.stop();
        }
      });
    }

    // Zoom function
    function zoomed(event) {
      svg.attr('transform', event.transform);
    }

    const main = () => {
      if(staticMode) {
        simulation.stop();
      } else {
        simulation.on("tick", ticked);
      }

      // Define the arrowhead marker for each link separately
      links.forEach(link => {
        const sourceId = link.source.id.replace(/\./g, ''); 
        const targetId = link.target.id.replace(/\./g, '');

        svg.append("defs").append("marker")
          .attr("id", `arrowhead-${sourceId}-${targetId}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 22)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color(link.source.group)); // Set arrow color based on the source node group
      });

      // Define a custom link generator with a curve
      const linkGenerator = d3.line()
        .curve(d3.curveCatmullRom.alpha(0.5)) // Adjust the curve tension (0.5 is the default, you can experiment with other values)
        .x(d => d.x)
        .y(d => d.y);

        function linkArc(d) {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.1; // Adjust the dr (radius) value to control the curvature
        
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        }

      // Add a path with arrowhead marker for each link, and a circle for each node.
      const link = svg.append("g")
        .attr("stroke-opacity", 0.6)
        .selectAll()
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("marker-end", d => {
          const sourceId = d.source.id.replace(/\./g, ''); 
          const targetId = d.target.id.replace(/\./g, '');
          if(d.is_directed) return `url(#arrowhead-static-${sourceId}-${targetId})`
          return '';
        })
        .attr("stroke", d => color(d.source.group))
        .attr("fill", "none")
        .attr("d", d => linkGenerator([d.source, d.target])); 

      const node = svg.append("g")
        .selectAll()
        .data(nodes)
        .join("circle")
        .attr("r", circleRadius)
        .attr("fill", d => color(d.group))
        .attr("stroke", d => color(d.group))
        .attr("stroke-width", 1.0)
        .attr("fill-opacity", 0.7)
        .on("click", onClick);

      node.append("title")
        .text(d => d.id);

      // Add a drag behavior.
      node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

      const texts = svg.selectAll("text.label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .attr("id", d => {
          const newId = d.id.replace(/\./g, '');
          return newId;
        })
        .attr("fill", "black")
        .style('fill', '#000')
        .style('font-size', '0.5rem')
        .attr('x', 6)
        .attr('y', 3)
        .style("display","none")
        .text(d => d.id);

      svgRef.current = svg;
      linkRef.current = link;
      nodeRef.current = nodes;
      simulationRef.current = simulation;

      function onClick(event, d) {
        // Reset all link arrowhead colors to the default color
        svg.selectAll('.link path').attr('fill', d => color(d.source.group));

        // Remove the 'selected' class from all nodes and links
        d3.selectAll(`.${styles.selected}`).classed(styles.selected, false);
        d3.selectAll(`.${styles.linkSelected}`).classed(styles.linkSelected, false);
        d3.selectAll(`.${styles.arrowSelected}`).classed(styles.arrowSelected, false);

        svg.selectAll("text.label").style("display", "none");

        // Add the 'selected' class to the clicked node
        d3.select(this).classed(styles.selected, true);

        const filtered = link.filter(function (v) {
        return v.source === d || v.target === d;
        });
        // Change the color of the arrowhead for the selected links to red
        filtered.classed(styles.linkSelected, true)
                .each(function (d) {
                  const sourceId = d.source.id.replace(/\./g, ''); 
                  const targetId = d.target.id.replace(/\./g, '');

                  svg.selectAll(`#arrowhead-${sourceId}-${targetId}`)
                    .selectAll('path')
                    .classed(styles.arrowSelected, true);
                });

        const newId = d.id.replace(/\./g, '');
        svg.select(`text.label#${newId}`).style("display", "block");
        simulation.tick();
        const desiredScale = 2; // You can adjust this value to control the zoom level

        // Calculate the translation to center the clicked node at the desired scale
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;
        const translateX = centerX - d.x * desiredScale;
        const translateY = centerY - d.y * desiredScale;

        // Apply the scaling and translation transformations to the SVG element with a smooth transition
        svg.transition()
          .duration(500)
          .attr('transform', `translate(${margin.left + translateX},${margin.top + translateY}) scale(${desiredScale})`);

      }

      if(staticMode) {
        // Run the simulation for a fixed number of iterations.
        for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
          ticked();
          simulation.tick();
        }
      }
      
      // Set the position attributes of links and nodes each time the simulation ticks.
      function ticked() {
        link.attr("d", d => linkGenerator([d.source, d.target])); // Update the link paths using the custom link generator
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
        texts
          .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
      }

      // Reheat the simulation when drag starts, and fix the subject position.
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        ticked();
      }

      // Update the subject (dragged node) position during drag.
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        ticked();
      }

      // Restore the target alpha so the simulation cools after dragging ends.
      // Unfix the subject position now that it’s no longer being dragged.
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = (staticMode)? event.x: null;
        event.subject.fy = (staticMode)? event.y : null;
      }

      if(staticMode) {
        nodes.forEach(node => {
          node.fx = node.x;
          node.fy = node.y;
        });
      }

    };

    if(staticMode) {
      d3.timeout(main);
    } else {
      main();
    }

    return () => {
      simulation.stop();
    };
  }, [data, pauseGraphRender]);

  useEffect(() => {
    if (selectedNodeId) {
      const selectedNode = nodeRef.current.find(node => node.id === selectedNodeId);
      highlight(selectedNode);
    } 
    
    function highlight(d) {
      // Reset all link arrowhead colors to the default color
      svgRef.current.selectAll('.link path').attr('fill', d => color(d.source.group));
    
      // Remove the 'selected' class from all nodes and links
      d3.selectAll(`.${styles.selected}`).classed(styles.selected, false);
      d3.selectAll(`.${styles.linkSelected}`).classed(styles.linkSelected, false);
      d3.selectAll(`.${styles.arrowSelected}`).classed(styles.arrowSelected, false);
  
      svgRef.current.selectAll("text.label").style("display", "none");
    
      // Add the 'selected' class to the clicked node
      const selectedSVGNode = svgRef.current.selectAll("circle").filter(function (nodeData) {
        return nodeData.id === d.id;
      }).node();
      d3.select(selectedSVGNode).classed(styles.selected, true);
  
      const filtered = linkRef.current.filter(function (v) {
        return v.source === d || v.target === d;
      });
      // Change the color of the arrowhead for the selected links to red
      filtered
      .classed(styles.linkSelected, true)
      .each(function (d) {
        const sourceId = d.source.id.replace(/\./g, ''); 
        const targetId = d.target.id.replace(/\./g, '');
  
        svgRef.current.selectAll(`#arrowhead-${sourceId}-${targetId}`)
        .selectAll('path')
          .classed(styles.arrowSelected, true);
      });
  
      const newId = d.id.replace(/\./g, '');
      svgRef.current.select(`text.label#${newId}`).style("display", "block");
      simulationRef.current.tick();
      const chartContainer = d3.select(chartRef.current);
      const width = chartContainer.node().getBoundingClientRect().width;
      const height = chartContainer.node().getBoundingClientRect().height - 5;
  
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const desiredScale = 2; // You can adjust this value to control the zoom level
  
      // Calculate the translation to center the clicked node at the desired scale
      const centerX = innerWidth / 2;
      const centerY = innerHeight / 2;
      const translateX = centerX - d.x * desiredScale;
      const translateY = centerY - d.y * desiredScale;
    
      // Apply the scaling and translation transformations to the SVG element with a smooth transition
      svgRef.current
        .transition()
        .duration(500)
        .attr('transform', `translate(${margin.left + translateX},${margin.top + translateY}) scale(${desiredScale})`);
    }
  }, [selectedNodeId]);

  return <div ref={chartRef} style={{ flex: 1 }} />;
};

export default Graph;
