import { useRouter } from 'next/router'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styles from '../../styles/Home.module.css';
import styles2 from '../../styles/Graphcomic.module.css';
import GraphComic from '../../components/GraphComic'
import DendrogramChart from '../../components/DendrogramChart';
import LayoutRow from '../../components/Timeline';
import SankeyChart from '../../components/SankeyChart';
import Filter from '../../components/Filter';
import { getInfo, getByType, getDissim, getSubgraphs, getComm } from '../../api/graph';
import { EMPTY_GRAPH } from '../../constants';
import { useArrayState, useObjectState } from '../../api/layout';
import { getCategory } from '../../api/graph';
import { debounce } from 'lodash'; // Assuming lodash's debounce is used
import Loader from '../../components/Loader';

// let customCSS = ''

export default function Home() {
  const router = useRouter();
  const dataName = router.query.data_name;

  const [isExistData, setIsExistData] = useState(null);
  const [currentGraph, setCurrentGraph] = useState(EMPTY_GRAPH);
  const [currentGraphId, setCurrentGraphId] = useState("");
  const [graphs, setGraphs] = useState([]);
  const [currentGroup, setCurrentGroup] = useState([]);
  const [colorGroup, setColorGroup] = useState([]);
  const [childGroup, setChildGroup] = useState(null);
  const [nodeId, setNodeId] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [mainCharacter, setMainCharacter] = useState({});
  const [activeTab, setActiveTab] = useState('overview'); // New state variable to track active tab
  const [info, setInfo] = useState([]);
  const [infoAll, setInfoAll] = useState([]);
  const [infoFull, setInfoFull] = useState([]);
  const [tableMains, setTableMains] = useState([]);
  const [supporter, setSupporter, supporterChangeCount] = useObjectState({});
  const [chartdata, setChartdata] = useState({});
  const [supportChart, setSupportChart] = useState({});
  const [domain, setDomain] = useArrayState([]);
  const [dissim, setDissim] = useState({});
  const [selectedAttribute, setSelectedAttribute] = useState('eigenvector_centrality');
  const [attributes, setAttributes] = useState([]);
  const [character, setCharacter] = useState(null);
  const [focusGroup, setFocusGroup] = useArrayState([]);
  const [focusMain, setFocusMain] = useState([]);
  const [currentSupporter, setCurrentSupporter] = useState([]);
  const [supportCandidate, setSupportCandidate] = useState({});
  const [handleCharacter, setHandleCharacter] = useState(() => {});
  const [mode, setMode] = useState('ego');
  const [thumbnails, setThumbnails] = useState({})
  const [commIds, setCommIds] = useState([]);
  const [replacement, setReplacement] = useState([]);
  const [addition, setAddition] = useState([]);
  const filterWidth = 0.6;
  const [clusters, setClusters] = useState([]);
  const [classes, setClasses] = useState({})
  const [linkClasses, setLinkClasses] = useState(new Set())
  const [customCSS, setCustomCSS] = useState('') 
  const [selectedTime, setSelectedTime] = useState(null);
  const [highlight, setHighlight, highlightChangeCount] = useObjectState({});
  const [threshold, setThreshold] = useState({"supporter": 30, "highlighter": 10});
  const [displayValue, setDisplayValue] = useState({"supporter": 70, "highlighter": 90});
  const [color, setColor] = useState({main: "#4e79a7", support: "#a0cbe8"});
  const allNodes = useRef([]);
  const [maxLink, setMaxLink] = useState(10);
  const [categoryList, setCategoryList] = useState([]);
  const [sankeyMode, setSankeyMode] = useState("louvain");
  const [selectedSankey, setSelectedSankey] = useState({});
  const curPos = useRef(null);
  const [graphList, setGraphList, graphListChangeCount] = useArrayState([]);
  const freshGenerate = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  
   
  const handleNodeClick = (nodeId) => {
    setNodeId(nodeId);
  };

  useEffect(() => {
    function handleCharacter(nodeId) {
      setCharacter(nodeId);
    };
    setHandleCharacter(() => handleCharacter);
  }, []);

	useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }
    if(!clusters) return;
		setFocusGroup(async (focusGroup) => {
      for(let graphEntry of focusGroup) {
        const { time } = graphEntry;
        const filtered = clusters.filter(cluster => Number(cluster.time) == Number(time));
        const fetchedData = [];
        for(const c of filtered) {
          const data = await getComm(dataName, c.time, c.id, sankeyMode);
          const el = { ...c, data: data, color: c.color };
          fetchedData.push(el);
        }
        if(JSON.stringify(graphEntry.clusters) === JSON.stringify(fetchedData)) continue;
        graphEntry.clusters = fetchedData;
      }
    });

		// const clustersList = focusGroup.map((graphEntry) => {
		// 	const { time } = graphEntry;
		// 	const filtered = clusters.filter(cluster => Number(cluster.time) == Number(time));
		// 	const fetchedData = []
		// 	filtered.map(async (c) => {
		// 	  const data = await getComm(dataName, c.time, c.id);
		// 	  const el = { ...c, data: data}
		// 	  fetchedData.push(el);
		// 	});
		// 	return {
		// 	  ...graphEntry,
		// 	  clusters: fetchedData
		// 	};
		// });
		// setFocusGroup(clustersList);
	}, [clusters, router.isReady, isExistData]);

  useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }
    if (currentGraphId === "") return;
    let [start, end] = currentGraphId.split("-").map(Number);
    const getList = async () => {
      let focusList = [];
      let mainList = [];
      if(end === undefined) end = start;
      for(let i = start; i <= end; i++) {
        // const mains = mainCharacter[start];
        const mains = mainCharacter[currentGraphId];
        if(mains === undefined) continue;
        const this_time_graph = {nodes: [], links: []};
        for(const main of mains) {
          const graph = await getSubgraphs(dataName, main, i, mode);
          if(!graph.node_present) {
            continue;
          }
          if(graph.node_present){
            this_time_graph.nodes.push(graph.nodes.map(node => JSON.stringify(node)));
            this_time_graph.links.push(graph.links.map(link => JSON.stringify(link)));
          }
        }
        const formattedNodeSet = [...new Set(this_time_graph.nodes.flat())].map((item) => {
          if (typeof item === 'string') return JSON.parse(item);
          else if (typeof item === 'object') return item;
        });
        const formattedLinkSet = [...new Set(this_time_graph.links.flat())].map((item) => {
          if (typeof item === 'string') return JSON.parse(item);
          else if (typeof item === 'object') return item;
        });
        if(formattedNodeSet.length === 0) continue;
        const categories = await getCategory(dataName, i, i, "");
        focusList.push({
          from: `${i}`,
          to: `${i}`,
          nodes: Array.from(formattedNodeSet),
          links: Array.from(formattedLinkSet),
          time: `${i}`,
          categories: categories
        });
        mainList.push([...mains]);
      }
      setFocusGroup(focusList);
      setFocusMain(mainList);
    };
    getList();
  // }, [currentGraphId, mainCharacter[currentGraphId.split('-')[0]]]);
  }, [currentGraphId, mainCharacter[currentGraphId], router.isReady, isExistData]);

  const numberFromPer = (percentage, total) => {
    return Math.round((percentage / 100) * total);
  }

  const debouncedUpdateThreshold = useCallback(debounce((value, support) => {
    if(support){
      setThreshold(current => ({ ...current, supporter: value }));
    }else{
      setThreshold(current => ({ ...current, highlighter: value }));
    }
  }, 500), []);

const handleSPvalue = (e) => {
  const value = parseInt(e.target.value, 10);
  setDisplayValue(current => ({ ...current, supporter: value }));
  // const processedValue = numberFromPer(value, maxLink);
  const processedValue = 100 - value;
  debouncedUpdateThreshold(processedValue, true);
};

const handleHLvalue = (e) => {
  const value = parseInt(e.target.value, 10);
  setDisplayValue(current => ({ ...current, highlighter: value }));
  // const processedValue = numberFromPer(value, maxLink);
  const processedValue = 100 - value;
  debouncedUpdateThreshold(processedValue, false);
};
  
  // const handleSPvalue = (e) => {
  //   const value = numberFromPer(parseInt(e.target.value, 10), maxLink)
  //   const newThreshold = {...threshold, supporter: value};
  //   setThreshold(newThreshold);
  // };
  
  // const handleHLvalue = (e) => {
  //   const value = numberFromPer(parseInt(e.target.value, 10), maxLink)
  //   const newThreshold = {...threshold, highlighter: value};
  //   setThreshold(newThreshold);
  // };

  const whatToEdit = (e) => {
    const event = new Event("edit");
    window.dispatchEvent(event);
  }

  const getAccessor = useMemo(() => {
    if (!Array.isArray(info) || info.length === 0) {
      return [];
    }
    const keys = Object.keys(info[0]).filter(key => key !== 'id');
    return keys;
  }, [info])

  const getAccessorFull = useMemo(() => {
    if (!Array.isArray(infoFull) || infoFull.length === 0) {
      return [];
    }
    const keys = Object.keys(infoFull[0]).filter(key => key !== 'id');
    return keys;
  }, [infoFull])

  const formatData = (data, attribute) => {
    const stats = [];
    
    if(attribute==='category'){
      const keys = Object.keys(Object.values(data)[0][0][attribute]);

      Object.keys(data).forEach((key) => {
        const values = data[key].map((entry) => entry[attribute]);
        const result = {};
        
        keys.forEach((catKey) => {
          // Assuming 'values' is an array of objects where each object contains a 'catKey' field
          const concatenatedArray = values.flatMap(item => item[catKey] || []).reduce((acc, currentArray) => acc.concat(currentArray), []);
          const uniqueArray = Array.from(new Set(concatenatedArray));
          
          // Accumulate results for each 'catKey'
          if (result[catKey]) {
            result[catKey] = Array.from(new Set(result[catKey].concat(uniqueArray)));
          } else {
            result[catKey] = uniqueArray;
          }
          result[catKey] = result[catKey].join('\n ')
        }
      );
      stats.push({
        id: key, 
        ...result
      })  
    });
    } else {
      Object.keys(data).forEach((key) => {
        const values = data[key].map((entry) => entry[attribute]);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;

        stats.push({
          id: key,
          min: Math.round(minValue * 100) / 100,   
          max: Math.round(maxValue * 100) / 100, 
          avg: Math.round(averageValue * 100) / 100,
        });
      });
    }
  
    return stats;
  };

  useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }

    const isAll = router.query.from === undefined && router.query.to === undefined;
    const timeFrom = router.query.from? router.query.from : 0;
    const timeTo = router.query.to? router.query.to : 0;
    getInfo(dataName, "true", isAll, timeFrom, timeTo).then((data) => {
      setCategoryList(Object.keys(Object.values(data)[0][0]["category"]));
      const totalInfo = formatData(data, 'total_num_edges');
      const greatestMax = Math.max(...totalInfo.map(item => item.max));
      setMaxLink(greatestMax);
      setAttributes(Object.keys(Object.values(data)[0][0]).filter(d => d !== 'label' && d !== 'time'));
      setInfoAll(data); 
      setChartdata(data);
    });

    getByType(dataName, "time", router.query.from, router.query.to).then((timeDomain) => {
      const from = parseInt(router.query.from);
      const to = parseInt(router.query.to);
      setDomain((dom) => {
        let cnt = 0;
        for(const key of timeDomain) {
          const larger_than_from = isNaN(from) ? true : (key >= from);
          const smaller_than_to = isNaN(to) ? true : (key <= to);
          if(larger_than_from && smaller_than_to) {
            dom[cnt++] = key;
          }
        }
      });
      // setDomain(arr);
    });
  }, [router.isReady, isExistData]);

  useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }

    getDissim(dataName, mode, router.query.from, router.query.to).then((data) => {
      setDissim(data);
    });
  }, [mode, router.isReady, isExistData]);

  useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }
    setInfo(formatData(infoAll, selectedAttribute)); 
  }, [infoAll, selectedAttribute, router.isReady, isExistData]);

  useEffect(() => {
    if(!router.isReady || !isExistData) {
      return;
    }
    if(currentGraphId === "") return;
    let [start, end] = currentGraphId.split("-").map(Number);
    getInfo(dataName, "false", "false", start, (end === undefined)? start : end).then((data) => {
      const _infoFull = formatData(data, selectedAttribute); 

      const main_set = new Set(focusMain.flat());
      const initial_mains = _infoFull.filter((item) => {
        return main_set.has(item.id.replaceAll("_", " "));
      });
      _infoFull.sort((a, b) => main_set.has(b.id.replaceAll("_", " ")) - main_set.has(a.id.replaceAll("_", " ")));
      setInfoFull([..._infoFull]);
      setTableMains(initial_mains);
    });
  }, [focusMain, selectedAttribute, router.isReady, isExistData]);

  // classes 가 변경 될 떄 마다 customCSS에 해당 class 있는지 확인하고 추가 그리고 css input 에 값 넣기
  useEffect(()=>{
    if(!router.isReady || !isExistData) {
      return;
    }
    const cssInput = document.getElementById('CSSInput')
    const classList = Object.values(classes).filter((value, index, self) => self.indexOf(value) === index).concat(Array.from(linkClasses));
    let newCustomCSS = customCSS;
    classList.map((item, index) => {
      if(item && !newCustomCSS.includes(`[${item}]`) && item.length > 0){
        newCustomCSS = newCustomCSS.concat(`#SVG [${item}] {${'\n\t\n'}}${'\n\n'}`)
      }
    })
    setCustomCSS(newCustomCSS)
    cssInput.value = newCustomCSS;
  }, [classes, linkClasses, router.isReady, isExistData])

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const CSSApply = (event) => {
    const cssInput = document.getElementById('CSSInput').value
    const body = document.getElementsByTagName('body')[0]
    let style = body.getElementsByTagName('style')[0];
    if(!style) {
      style = document.createElement('style')
      body.appendChild(style)
    }
    setCustomCSS(cssInput)
    style.innerHTML = `${cssInput}`
  }

  const CSSDone = (event) => {
    document.getElementById('MainCharcterWrapper').style.flex = filterWidth;
    document.getElementById('SupportCharcterWrapper').style.display = 'flex';
    document.getElementById('CSSWrapper').style.display = 'none';
  }

  useEffect(() => {
    if(!router.isReady) {
      return;
    }
    async function getData() {
      const check = await fetch(`/api/check-data?data_name=${dataName}`);
      const { is_exist } = await check.json();
      setIsExistData(is_exist);
    }
    getData();
  }, [router.isReady])

  if(!router.isReady) {
    return <></>;
  }

  if(isExistData === null) {
    return <p>Loading the data...</p>;  
  }

  if(!isExistData) {
    return <p>The data name you provided does not exist in our database!</p>;
  }

  return (
    <main className={styles.main}>
      {isLoading && <Loader/>}
      <div className={`${styles.vertical_wrapper} gap5`} style={{flex:0.5}}>
        <GraphComic data_name={dataName}
                    className={`${styles.graph_comic} box`} 
                    graphList={graphList}
                    setGraphList={setGraphList}
                    data={currentGroup}
                    colorData={colorGroup}
                    setData={setCurrentGroup}
                    childCluster={childGroup}
                    currentGraph={currentGraph} 
                    setCurrentGraph={setCurrentGraph} 
                    mode={mode}
                    character={character}
                    mainCharacter={mainCharacter} 
                    thumbnails={thumbnails}
                    setMainCharacter={setMainCharacter} 
                    supporter={supporter}
                    setSupporter={setSupporter}
                    highlight={highlight}
                    setHighlight={setHighlight}
                    setThumbnails={setThumbnails}
                    currentGraphId={currentGraphId} 
                    setCurrentSupporter={setCurrentSupporter}
                    setCurrentGraphId={setCurrentGraphId}
                    replacedGraph={replacement}
                    setReplacedGraph={setReplacement}
                    addedGraph={addition}
                    setAddedGraph={setAddition}
                    supportCandidate={supportCandidate}
                    setSupportCandidate={setSupportCandidate}
                    clusters={clusters}
                    classes={classes}
                    linkClasses={linkClasses}
                    setLinkClasses={setLinkClasses}
                    selectedTime={selectedTime}
                    threshold={threshold}
                    color={color}
                    allNodes={allNodes}
                    sankeyMode={sankeyMode}
                    selectedSankey={selectedSankey}
                    setSelectedSankey={setSelectedSankey}
                    freshGenerate={freshGenerate}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
        />
      </div>
      <div className={`${styles.vertical_wrapper} gap5`} style={{flex:0.12}}>
        <div className={`${styles.graph} box`}>
          <LayoutRow className={`${styles.graph} box`}
                     yearList={focusGroup} 
                     mainList={focusMain} 
                    //supporter={(currentGraphId === "")? [] : supporter[parseInt(currentGraphId.split("-")[0])]}
                     supporter={(currentGraphId === "")? [] : supporter[currentGraphId]}
                     setReplacement={setReplacement}
                     setAddition={setAddition}
                     color={color}
                     isLoading={isLoading}
                     setIsLoading={setIsLoading}
                     />
        </div>
      </div>
      <div className={`${styles.outer_wrapper}`} style={{flex:0.38}}>
        <div className={`${styles.inner_wrapper} gap5 pad5r`}>
        <div className={`${styles.graph} box`}>
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Summary
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'character' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('character')}
          >
            Node Attribute
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'community' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('community')}
          >
            Community
          </button>
        </div>
        <div className={`${styles.graph}`} style={{display: activeTab === 'overview'? 'flex' : 'none'}}>
          {/* <div className='title'>DendrogramChart</div> */}
          {/* <div style={{flex:0.1}}>y
            <button className={`${styles.generate_button}`}>Generate</button>
          </div> */}
          <DendrogramChart
            setGraphList={setGraphList}
            freshGenerate={freshGenerate}
            curPos={curPos} 
            data_name={dataName}
            setCurrentGraphId={setCurrentGraphId}
            setColorGroup={setColorGroup}
            setCurrentGroup ={setCurrentGroup}
            setChildGroup={setChildGroup}
            mainCharacter={mainCharacter}
            setMainCharacter={setMainCharacter}
            character={character}
            mode={mode}
            setMode={setMode}
            setSelectedTime={setSelectedTime}
            title={character}
            from={router.query.from}
            to={router.query.to}
            // setReplacement={setReplacement}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>
        {activeTab === 'character' && ( 
        <div className={`${styles.graph}`} style={{flexDirection: 'column'}}>
          {/* <div className='title'>Filter</div> */}
          <Filter
            data_name={dataName}
            data={info}
            chartData={chartdata}
            domain={domain}
            dissim={dissim}
            selectedAttribute={selectedAttribute}
            setSelectedAttribute={setSelectedAttribute}
            attributes={attributes}
            accessor={getAccessor}
            onRowClick={handleCharacter}
            className={"setMainCharacter"}
            sankeyMode={sankeyMode}
          />
        </div>
        )}
        {activeTab === 'community' && ( 
        <div className={`${styles.graph}`}>
          {/* <button onClick={updateNodeIds}>Update Node IDs</button> */}
          <SankeyChart  data_name={dataName}
                        nodeIdsToConnect={commIds}
                        setNodeIdsToConnect={setCommIds}
                        clusters={clusters}
                        setClusters={setClusters}
                        allNodes={allNodes}
                        categoryList={categoryList}
                        mode={sankeyMode}
                        setMode={setSankeyMode}
                        from={router.query.from}
                        to={router.query.to}
                        setSelectedSankey={setSelectedSankey}
          />
        </div>
        )}
        </div>
        <div className={`${styles.graph} ${styles.row} gap5`} style={{flex:0.1}}>
        <div className={`${styles.graph} box`}>
        <div className={`${styles.graph} ${styles.row}`} style={{ justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', gap: '1rem'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1}}>
            <span className='font' style={{flex: 0.5, textAlign: 'center'}}>Supporter</span>
            <input type="range" className={styles.slider} id="supporterValue" style={{flex: 1, margin: '0 10px'}} 
            min="0" max='100' value={displayValue["supporter"]} onChange={handleSPvalue}/>
            <span className='font' style={{flex: 0.5, textAlign: 'center'}}>{`Top ${100-displayValue["supporter"]}%`}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1}}>
            <span className='font' style={{flex: 0.5, textAlign: 'center'}}>Highlighter</span>
            <input type="range" className={styles.slider} id="highlightValue" style={{flex: 1, margin: '0 10px'}} 
            min="0" max='100' value={displayValue["highlighter"]} onChange={handleHLvalue}/>
            <span className='font' style={{flex: 0.5, textAlign: 'center'}}>{`Top ${100-displayValue["highlighter"]}%`}</span>
          </div>
        </div>
        </div>
        </div>
        <div className={`${styles.graph} ${styles.row} gap5`}>
        <div className={`${styles.graph} ${styles.row}`}>
        <div id='MainCharcterWrapper' className={`${styles.vertical_wrapper}`} style={{flex:filterWidth}}>
          <div className={`${styles.graph} box`} style={{borderRight: 'solid 0.05rem #ddd'}}>
            <div className='title'>            
              <div>
                Main Character
                <input
                      type="color"
                      id={styles.circle_swatch}
                      defaultValue="#4e79a7" 
                      style={{marginLeft: "0.2rem"}}
                      onChange={(e) => {
                        setColor({
                          ...color,
                          main: e.target.value
                        })
                    }}/>
              </div>
            </div>
            <Filter 
                from_to={[router.query.from, router.query.to]}
                data_name={dataName}
                data={infoFull}
                // accessor={['min', 'max', 'avg']}
                accessor={getAccessorFull}
                onRowClick={() => {}}
                className={"main"}
                graphList={graphList}
                setGraphList={setGraphList}
                mode={mode}
                // initSelect={(currentGraphId === "" || mainCharacter[currentGraphId.split('-')[0]] === undefined)? [] : mainCharacter[currentGraphId.split('-')[0]].map((main) => main.replaceAll(" ", "_"))}
                initSelect={(currentGraphId === "" || mainCharacter[currentGraphId] === undefined)? [] : mainCharacter[currentGraphId].map((main) => main.replaceAll(" ", "_"))}
                characters={mainCharacter}
                setCharacters={setMainCharacter}
                // currentGraph={(currentGraphId !== undefined) ? currentGraphId.split('-')[0] : null}
                currentGraph={(currentGraphId !== undefined) ? currentGraphId : null}
                commIds={commIds}
                setCommIds={setCommIds}
                range={(currentGraphId === "")? [] : currentGraphId.split('-')}
                classes={classes}
                setClasses={setClasses}
                sankeyMode={sankeyMode}
                selectedSankey={selectedSankey}
                setSelectedSankey={setSelectedSankey}
                setSupporter={setSupporter}
                setHighlight={setHighlight}
              />
          </div> 
        </div>
        <div id='SupportCharcterWrapper' className={`${styles.vertical_wrapper}`} style={{flex:1-filterWidth}}>
          <div className={`${styles.graph} box`} style={{borderLeft: 'solid 0.05rem #ddd'}}>
          <div className='title'>
            <div>
              Supporting Character
              <input
                    type="color"
                    id={styles.circle_swatch}
                    defaultValue="#a0cbe8" 
                    style={{marginLeft: "0.2rem"}}
                    onChange={(e) => {
                      setColor({
                        ...color, 
                        support: e.target.value
                      })
                  }}/>
            </div>
              <button className={styles2.canvas_button} onClick={whatToEdit}>EDIT</button>
            </div>
            <Filter 
                from_to={[router.query.from, router.query.to]}
                data_name={dataName}
                // data={(currentGraphId === "" || supportCandidate[currentGraphId.split('-')[0]] === undefined)? [] : supportCandidate[currentGraphId.split('-')[0]]}
                data={(currentGraphId === "" || supportCandidate[currentGraphId] === undefined)? [] : supportCandidate[currentGraphId]}
                accessor={['weight']}
                onRowClick={() => {}}
                className={"support"}
                // initSelect={(currentGraphId === "" || supporter[currentGraphId.split('-')[0]] === undefined)? [] : supporter[currentGraphId.split('-')[0]].map(char => char.id)}
                initSelect={(currentGraphId === "" || supporter[currentGraphId] === undefined)? [] : supporter[currentGraphId].map(char => char.id)}
                characters={supporter}
                setCharacters={setSupporter}
                // currentGraph={(currentGraphId !== undefined) ? currentGraphId.split('-')[0] : null}
                currentGraph={(currentGraphId !== undefined) ? currentGraphId : null}
                commIds={commIds}
                setCommIds={setCommIds}
                range={(currentGraphId === "")? [] : currentGraphId.split('-')}
                sankeyMode={sankeyMode}
                selectedSankey={selectedSankey}
                setSelectedSankey={setSelectedSankey}
              />
          </div>
        </div>
          {/* <div className={`${styles.graph} ${styles.column7} box`}>
            <div className='title'>Graph
              <div className={styles.button_wrapper}>
                <button id='toggleGraphRender' className={styles.graph_change_button}>Pause</button>
              </div>
            </div>
            {
              (currentGraph.nodes.length > 0)? <Graph data={currentGraph} staticMode={false} selectedNodeId={nodeId}/> : <></>
            }
          </div>
          <div className={`${styles.graph} ${styles.column3} box`}>
            <Table 
            data={currentGraph.nodes} 
            mainCharacter={mainCharacter} 
            setMainCharacter={setMainCharacter} 
            onRowClick={handleNodeClick} 
            currentGroup={currentGroup} 
            currentGraphId={currentGraphId}/>
          </div> */}
        </div>
        <div id='CSSWrapper' className={`${styles.vertical_wrapper} gap5`} style={{flex:1, display: 'none'}}>
          <div className={`${styles.graph} box`}>
            <div className='title'>CSS
              <div className={styles.button_wrapper}>
                <button className={styles.apply_button} onClick={CSSApply}>Apply</button>
                <button className={styles.apply_button} onClick={CSSDone}>Done</button>
              </div>
            </div>
            <textarea id='CSSInput' className={styles.css_input} type='text' />
          </div>
        </div>
        </div>
      </div>
      </div>
    </main>
  )
}
