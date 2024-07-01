import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { getSankey } from '../pages/api/graph';

const SankeyChart = () => {
  const ref = useRef(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Assuming getSankey() function fetches your data
    getSankey().then((fetchedData) => {
      setData(fetchedData);
    });
  }, []);

  useEffect(() => {
    if (data) {
      const chartContainer = d3.select(ref.current);
      const fullWidth = chartContainer.node().getBoundingClientRect().width;
      const fullHeight = chartContainer.node().getBoundingClientRect().height;
      const margin = { top: 20, right: 20, bottom: 70, left: 40 };
      const width = fullWidth - margin.left - margin.right;
      const height = fullHeight - margin.top - margin.bottom;
      
      chartContainer.selectAll("*").remove();
      
      const reformattedData = {};
      const yearList = new Set();
      const keys = new Set();
      const yearSum = {};

      // Reformating the data
      data.nodes.forEach(d => {
        const [year, key] = d.id.split('-');
        yearList.add(year);
        keys.add(d.id);

        if (!reformattedData[year]) {
          reformattedData[year] = {};
          yearSum[year] = 0;
        }

        reformattedData[year][d.id] = d.value;
        yearSum[year] += d.value;
      });


      const dataArray = Array.from(yearList).sort().map(year => {
        const normalizedData = {};
        for (const key of keys) {
          const [keyYear, ] = key.split('-');
          if (keyYear === year) {
            normalizedData[key] = reformattedData[year][key] / yearSum[year];
          }
        }
        return { year, ...normalizedData };
      });

      const svg = chartContainer
        .append('svg')
        .attr('width', fullWidth)
        .attr('height', fullHeight)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const x = d3.scaleBand()
        .domain(Array.from(yearList).sort())
        .range([0, width])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(dataArray, d => Array.from(keys).reduce((acc, key) => acc + (d[key] || 0), 0))])
        // .nice()
        .range([height, 0]);

      const color = d3.scaleOrdinal()
        .domain(Array.from(keys))
        .range(d3.schemeSet2);

      const stack = d3.stack()
        .keys(Array.from(keys))
        .order(d3.stackOrderAscending)
        .offset(d3.stackOffsetNone);

      const series = stack(dataArray);

      svg.append('g')
        .selectAll('g')
        .data(series)
        .enter().append('g')
          .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter().append('rect')
          .attr('x', (d, i) => x(d.data.year))
          .attr('y', d => y(d[1]))
          .attr('height', d => y(d[0]) - y(d[1]))
          .attr('width', x.bandwidth());

      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg.append('g')
        .call(d3.axisLeft(y));
    }
  }, [data]);

  return <div style={{ width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden'}} ref={ref}></div>;
};

export default SankeyChart;
