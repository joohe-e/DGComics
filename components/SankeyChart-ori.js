import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { getSankey } from '../pages/api/graph';

const SankeyChart = () => {
  const ref = useRef(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    getSankey().then((fetchedData) => {
      setData(fetchedData);
    });
  }, []);

  useEffect(() => {
    if (data) {
      const chartContainer = d3.select(ref.current);
      const width = chartContainer.node().getBoundingClientRect().width;
      const height = chartContainer.node().getBoundingClientRect().height - 5;

      chartContainer.selectAll("*").remove();
      const svg = chartContainer
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const sankeyGenerator = sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .extent([[1, 5], [width - 1, height - 5]]);

      let { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map(d => Object.assign({}, d)),
        links: data.links.map(d => Object.assign({}, d))
      });

      const sumByYear = {};

      nodes.forEach(node => {
        node.value = 0;
        node.year = node.id.split('-')[0];
      });

      links.forEach(link => {
        link.source.value += link.value;
        link.target.value += link.value;
      });

      nodes.forEach(node => {
        sumByYear[node.year] = (sumByYear[node.year] || 0) + node.value;
      });
      
      const years = Object.keys(sumByYear);
    //   const yearColumnWidth = (width - (years.length - 1) * 10) / years.length;
    const yearColumnWidth = 10;
      const numMax = Math.max(...Object.values(sumByYear));

      nodes.forEach(node => {
        const columnIndex = years.indexOf(node.year);
        node.x0 = columnIndex * (yearColumnWidth + 30);
        node.x1 = node.x0 + yearColumnWidth;
        node.y1 = node.y0 + (node.value / numMax) * height;
      });

      const color = d3.scaleOrdinal(d3.schemeCategory10);
      console.log(nodes);
      console.log(links);

      svg.append("g")
        .attr("stroke", "#000")
        .selectAll("rect")
        .data(nodes)
        .enter()
        .append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.id));

      const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
        .selectAll("g")
        .data(links)
        .enter()
        .append("g")
        .style("mix-blend-mode", "multiply");

      link.append("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.id))
        .attr("stroke-width", d => Math.max(1, d.width));
    }
  }, [data]);

  return <div style={{ width: '100%', height: '100%', overflow: 'auto' }} ref={ref}></div>;
};

export default SankeyChart;
