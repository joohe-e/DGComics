import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const Heatmap = ({ data, attribute, width, height, domain, dissim, metadata }) => {
  const max = metadata ? metadata[0].max : 100;
  const min = metadata ? metadata[0].min : 0;
  const graphRef = useRef(null);

  useEffect(() => {
    if (data && graphRef.current && dissim) {
      const svg = d3.select(graphRef.current);
      const margin = { top: 2, right: 4, bottom: 12, left: 4 };

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      svg.selectAll('*').remove();

      const x = d3.scaleLinear()
        .domain([domain[0], domain[domain.length - 1]])
        .range([0, chartWidth]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[attribute])])
        .nice()
        .range([chartHeight, 0]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      function customInterpolator(t) {
        return d3.interpolateReds(t * 0.85 + 0.15);
      }
      
      const colorScale = d3.scaleSequential()
        .domain([min, max])
        .interpolator(customInterpolator);
    
      const padding = 0.5;  // Adjust this value to set the padding between areas
      dissim.filter(e => !e.hasOwnProperty('metadata')).forEach(e => {
          if(e.from < domain[0] || e.to > domain[domain.length - 1]) return;
          const rectWidth = x(e.to) - x(e.from) - padding;  // Reduce the width of each rectangle by the padding value
          const rectX = x(e.from) + (padding / 2);  // Adjust the starting position of each rectangle to add padding
      
          const highlightRect = g.append('rect')
              .attr('x', rectX)
              .attr('y', 0)
              .attr('width', rectWidth)
              .attr('height', chartHeight)
              .attr('fill', colorScale(e.distance))
              .attr('fill-opacity', 1);
      });
      g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(
            d3.axisBottom(x)
              .ticks(5)
              .tickFormat((d, i, ticks) => (i === 0 || ticks.length - 1 ? (d % 100 < 10 ? '0' : '') + (d % 100) : ''))
              .tickSize(2) // Set tick size to 0 to remove tick lines
          )
          .selectAll('text') // Select all tick label text elements
          .style('font-size', '8px');
    }
  }, [data, width, height, dissim]);

  return <svg ref={graphRef} width={width} height={height} />;
};

export default Heatmap;
