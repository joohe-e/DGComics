import * as d3 from 'd3';
import { getAll } from '../api/graph';

export const computePositions = (allData) => {
    // Convert array of string ids to array of objects
    const nodes = allData.nodes.map(id => ({ id: id }));
    const links = allData.links;
  
    // Initialize the D3 simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter());
  
    // Run the simulation for a certain number of ticks to let it stabilize
    for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
      simulation.tick();
    }
  
    // Find the bounding box of the graph
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    nodes.forEach(node => {
      if (node.x < xMin) xMin = node.x;
      if (node.x > xMax) xMax = node.x;
      if (node.y < yMin) yMin = node.y;
      if (node.y > yMax) yMax = node.y;
    });
  
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
  
    // Create a dictionary with normalized positions
    const nodePositions = {};
    nodes.forEach(node => {
      nodePositions[node.id] = {
        x: (node.x - xMin) / xRange,
        y: (node.y - yMin) / yRange,
      };
    });
  
    return nodePositions;
  };