import styles from '../styles/Hierarchy.module.css'
import React from 'react';
import Tree from 'react-d3-tree';
import DendrogramChart from './DendrogramChart';
import Graph from './Graph';
import Table from './Table';
import TableList from './TableList';
import sample from '../data/graph_data.json';
import { useState } from 'react';

const Hierarchy = ({data, className}) => {
  const [currentGraph, setCurrentGraph] = useState(sample);
  const [selectedNodeId, setSelectedNodeId] = useState(null); // Define selectedNodeId state here

  const changeGraph = (event) =>{
    console.log(event)
  }
  
  const handleNodeClick = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div id='Hierarchy' className={className}>
      <div className={styles.graph + ' box'}>
        <div className='title'>DendrogramChart</div>
        <DendrogramChart currentGraph={currentGraph} setCurrentGraph={setCurrentGraph}/>
        {/* <div className={styles.tree_container}>
          <Tree 
          data={orgChart} 
          orientation='vertical'
          pathFunc="step"/>
        </div> */}
      </div>
      <div className={`${styles.graph} ${styles.row}`}>
      <div className={`${styles.graph} ${styles.column7} box`}>
        <div className='title'>Graph
          <div className={styles.button_wrapper}>
            <button className={styles.graph_change_button} onClick={changeGraph}>Graph1</button>
            <button className={styles.graph_change_button} onClick={changeGraph}>Graph2</button>
          </div>
        </div>
          <Graph data={currentGraph} selectedNodeId={selectedNodeId} />
      </div>
      <div className={`${styles.graph} ${styles.column3} box`}>
        {/* <div className='title'>Filter</div> */}
        <Table data={currentGraph.nodes} onRowClick={handleNodeClick} />
      </div>
      </div>
    </div>
  )
};

export default Hierarchy;