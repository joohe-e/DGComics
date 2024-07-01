import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Chart = ({ data, attribute, width, height, domain, maxSize }) => {
  const graphRef = useRef(null);

  useEffect(() => {
    if (data && graphRef.current) {
      const svg = d3.select(graphRef.current);
      const margin = { top: 4.5, right: 4, bottom: 12, left: maxSize.width + 5 };

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      svg.selectAll('*').remove();

      const pointColor = (target, total) => {
        const color = d3.schemeTableau10;
        const idx = total.indexOf(target) % color.length; 
        return color[idx];
      }

      const x = d3.scaleLinear()
        .domain([domain[0], domain[domain.length - 1]])
        .range([0, chartWidth]);

      const yDomain = attribute === 'category' ? [0, 1] : [0, d3.max(data, d => d[attribute])];
      // Insert average value in the middle of the domain
      if(attribute !== 'category') {
        const yDomainMiddle = (yDomain[0] + yDomain[1]) / 2;
        yDomain.splice(1, 0, yDomainMiddle);
      }

      const y = d3.scaleLinear()
        .domain([0, attribute==='category' ? 1 : d3.max(data, d => d[attribute])])
        .nice()
        .range([chartHeight, 0]);

      const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d[attribute]));

      const dashedLine = d3.line()
        .x(d => x(d.time))
        .y(d => y(d[attribute]))
        .defined(d => d !== undefined)
        .curve(d3.curveLinear);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const segments = [];
      let categories = [];
      let currentSegment = [data[0]];
      for (let i = 1; i < data.length; i++) {
        if(attribute==='category') categories.push(...Object.values(data[i][attribute]).flat());
        if (data[i].time - data[i - 1].time === 1) {
          currentSegment.push(data[i]);
        } else {
          segments.push(currentSegment);
          currentSegment = [data[i]];
        }
      }
      segments.push(currentSegment);

      if (attribute === "category") {
        g.attr('transform', `translate(0,${margin.top})`);
        const colorMap = [...new Set(categories)];
        segments.forEach(segment => {
          segment.forEach((point, index) => {
            const midY = 0.7;
            g.append('circle')
              .attr('cx', x(point.time))
              .attr('cy', y(midY))
              .attr('r', 2)
              .attr('fill', pointColor(Object.values(point.category).flat()[0], colorMap));
          });
        });
      } else {
        segments.forEach(segment => {
          if (segment.length === 1) {
            g.append('circle') // Render a circle for a single point
              .attr('cx', x(segment[0].time))
              .attr('cy', y(segment[0][attribute]))
              .attr('r', 2)
              .attr('fill', 'steelblue');
          } else {
            const isConsecutive = segment.length > 1;

            g.append('path') // Render a line for consecutive points
              .datum(segment)
              .attr('fill', 'none')
              .attr('stroke', 'steelblue')
              .attr('stroke-width', 2)
              .attr('d', line);
          }

          // dashed line
          g.append('path')
              .datum(data)
              .attr('fill', 'none')
              .attr('stroke', 'steelblue')
              .attr('stroke-width', 1)
              .attr('stroke-dasharray', '3,3')
              .attr('d', line);

        });

        const tick = d3.axisLeft(y)
                       .tickValues(yDomain)
                       .tickSize(2) 
                       .tickFormat(d3.format(".2f"));

        g.append('g')
          .attr('transform', `translate(0, 0)`)
          .call(tick)
          .selectAll('text') // Select all tick label text elements
          .style('font-size', '8px');
      }
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
  }, [data, width, height]);

  return <svg ref={graphRef} width={width} height={height} />;
};

export default Chart;
