import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/Graphcomic.module.css'
import StaticGraph from './StaticGraph';
import { EMPTY_GRAPH } from '../constants';

const LayoutRow = ({ 
                    className, 
                    yearList, 
                    mainList, 
                    supporter, 
                    setReplacement, 
                    setAddition, 
                    color,
                    isLoading,
                    setIsLoading,
                  }) => {
    const [selectedGraphs, setSelectedGraphs] = useState([]);


    const addCanvas = (e) => {      
      setIsLoading(true);
      const sortedSelectedGraphs = [...selectedGraphs].sort((a, b) => a.graphData.time - b.graphData.time);
      setAddition(sortedSelectedGraphs);
      setSelectedGraphs([]);
    }

    const replaceCanvas = (e) => {
      setIsLoading(true);
      const sortedSelectedGraphs = [...selectedGraphs].sort((a, b) => a.graphData.time - b.graphData.time);
      setReplacement(sortedSelectedGraphs);
      setSelectedGraphs([]);
    }

    const handleGraphClick = (graphData, mainCharacter) => {
      const graphKey = graphData.time + "_" + mainCharacter;
      const isSelected = selectedGraphs.some(g => g.key === graphKey);
  
      if (isSelected) {
        // Already selected, so deselect it
        setSelectedGraphs(selectedGraphs.filter(g => g.key !== graphKey));
      } else {
        // Select the new graph
        graphData.from = graphData.time;
        graphData.to = graphData.time;
        graphData.range = `${graphData.time}`;
        setSelectedGraphs([...selectedGraphs, { key: graphKey, graphData, mainCharacter }]);
      }
    };

    return (
    <div className={className}>
        <div className='title'>Timeline
        <div className={styles.button_wrapper}>
        <button id='TimelineAdd' className={styles.canvas_button} onClick={addCanvas}>ADD</button>
        <button id='TimelineRepl' className={styles.canvas_button} onClick={replaceCanvas}>REPL</button>
        </div>
        </div>
        <div className={styles.layout_col}> 
          {Array.from({ length: yearList.length }, (_, i) => {
            return (
              <div key={i} 
                  className={styles.layout_item}
                  onClick={() => handleGraphClick(yearList[i], mainList[i])}>
                <div className= {selectedGraphs.some(g => g.key === (yearList[i].time + "_" + mainList[i])) ? styles.layout_active : styles.layout_deactive}
                style={{
                    height: '11%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    // backgroundColor: selectedGraphs.some(g => g.key === (yearList[i].time + "_" + mainList[i])) ? '#cd9495' : '#ccc'
                  }}
                    >
                  {yearList[i].time}
                </div> 
                <div style={{height: '85%', display: 'flex'}}>
                  <StaticGraph data={yearList[i]}
                              where={"Timeline"}
                              graphAdd={EMPTY_GRAPH}
                              graphDelete={EMPTY_GRAPH}
                              mainCharacter={mainList[i]} 
                              supporter={supporter}
                              cluster={yearList[i].clusters}
                              color={color}
                              categories={yearList[i].categories}/>
                </div>
              </div>
          )})}
        </div>
    </div>
    );
};

export default LayoutRow;