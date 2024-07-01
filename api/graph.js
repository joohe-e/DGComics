import * as d3 from 'd3';

export async function getGraph(data_name, id) {
    const response = await fetch(`/api/graph?data_name=${data_name}&id=${id}`);
    const graph = await response.json();
    return graph;
}

export async function getByType(data_name, type, from, to) {
    let filter = '';
    if(from) {
        filter = filter + `&from=${from}`;
    }
    if(to) {
        filter = filter + `&to=${to}`;
    }
    const response = await fetch(`/api/total?data_name=${data_name}&type=${type}${filter}`);
    const data = await response.json();
    return data;
}

export async function getInfo(data_name, skip1, all, from, to) {
    const response = await fetch(`/api/table?data_name=${data_name}&skip1=${skip1}&all=${all}&_from=${from}&_to=${to}`);
    const data = await response.json();
    return data;
}

export async function getCategory(data_name, from, to, attribute) {
    const response = await fetch(`/api/category?data_name=${data_name}&_from=${from}&_to=${to}&attribute=${attribute}`);
    const data = await response.json();
    return data;
}

export async function getDissim(data_name, mode, from, to) {
    let filter = '';
    if(from) {
        filter = filter + `&from=${from}`;
    }
    if(to) {
        filter = filter + `&to=${to}`;
    }
    const response = await fetch(`/api/dissim?data_name=${data_name}&mode=${mode}${filter}`);
    const data = await response.json();
    return data;
}

export async function getSankey(data_name, mode, allNodes, from, to) {
    const query_list = [];
    for(const id of allNodes) {
        query_list.push(id.replaceAll("_", " "));
    }

    const filter = {q: query_list};

    if(from) {
        filter.from = from;
    }
    if(to) {
        filter.to = to;
    }
    if(mode !== "louvain") {
        filter.category = mode;
    }

    const url = `/api/sankey?data_name=${data_name}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filter),
    });

    const data = await response.json();
    return data;
}

export async function getComm(data_name, time, div, category) {
    let filter = '';
    if(category && category !== "louvain") {
        filter = filter + `&category=${category}`;
    }
    const response = await fetch(`/api/comm?data_name=${data_name}&time=${time}&div=${div}${filter}`);
    const data = await response.json();
    return data;
}

export async function getPart(data_name, time, id) {
    const response = await fetch(`/api/part?data_name=${data_name}&time=${time}&id=${id}`);
    const data = await response.json();
    return data;
}

// export function getNeighbours(v, nodes, links) {
//     if(v === undefined) {
//         return [Array.from([]), Array.from([])];
//     }

//     const neighbours = new Set();

//     const reverseId = {};
//     nodes.forEach(function (n) {
//         reverseId[n.id] = {...n};
//     });

//     links.forEach(function (e) {

//         if(e.source === v.id) {
//             neighbours.add(JSON.stringify(reverseId[e.target]));
//             return;
//         }

//         if(e.target === v.id) {
//             neighbours.add(JSON.stringify(reverseId[e.source]));
//             return;
//         }
//     });

//     if(!neighbours.has(JSON.stringify(v))) {
//         neighbours.add(JSON.stringify(v));
//     }

//     const adjEdges = links.filter((link) => {
//         if(!neighbours.has(JSON.stringify(reverseId[link.target]))) {
//             return false;
//         }
//         if(!neighbours.has(JSON.stringify(reverseId[link.source]))) {
//             return false;
//         }
//         return true;
//     });

//     const formattedNodeSet = [...neighbours].map((item) => {
//         if (typeof item === 'string') return JSON.parse(item);
//         else if (typeof item === 'object') return item;
//     });

//     return [Array.from(formattedNodeSet), adjEdges];
// }

export async function getMainCharacters(data_name, mode, from, to) {
    const response = await fetch(`/api/center?data_name=${data_name}&type=${mode}&from=${from}&to=${to}`);
    const data = await response.json();
    return data;
}

export async function getChangeNeighbours(data_name, id, from, to, type, mode) {
    id = id.replaceAll(" ", "_");
    const response = await fetch(`/api/difference?data_name=${data_name}&mode=${mode}&id=${id}&from=${from}&to=${to}&type=${type}`);
    const data = await response.json();
    return data;
}

export async function getCombineGraph(data_name, id, from, to, type, mode) {
    id = id.replaceAll(" ", "_")
    const response = await fetch(`/api/subgraph-set?data_name=${data_name}&mode=${mode}&id=${id}&from=${from}&to=${to}&type=${type}`);
    const data = await response.json();
    return data;
}

export async function getSubgraphs (data_name, id, year, mode) {
    id = id.replaceAll(" ", "_")
    const response = await fetch(`/api/subgraph?data_name=${data_name}&mode=${mode}&id=${id}&year=${year}`);
    const data = await response.json();
    return data;
}

export async function getDefaultMainCharacters(data_name, data,character, mode) {
    if(data == null || data.length == 0) {
        return [];
    }
    const new_mains = {};
    for(const element of data) {
        const numericPattern = /^[0-9]+$/;
        const range = element.split("-");
        const from = range[0];
        const to = range[range.length - 1];
        const inputRange = range.length > 1 ? range[0] + "-" + range[range.length - 1] : range[0];
        if (!numericPattern.test(from)) {
            continue;
        }
        if(character === null) {
            // new_mains[parseInt(from)] = await getMainCharacters(from, to);
            new_mains[inputRange] = await getMainCharacters(data_name, mode, from, to);
        } else {
            // new_mains[parseInt(from)] = [character.replaceAll("_", " ")];
            new_mains[inputRange] = [character.replaceAll("_", " ")];
        }
    }

    return new_mains;
    // setMainCharacter(new_mains);
}

export async function getListOfGraphs(data_name, data, mainCharacter, mode){
	if(data == null || data.length == 0) {
		return [];
	}
	const graphs = [];
	for(const element of data){
        const numericPattern = /^[0-9]+$/;
        const range = element.split("-");
        const from = range[0];
        const to = range[range.length - 1];
        const inputRange = range.length > 1 ? range[0] + "-" + range[range.length - 1] : range[0];
        if (!numericPattern.test(from)) {
            graphs.push({});
            continue;
        }
        // const main_characters = (mainCharacter[parseInt(from)] === undefined)? await getMainCharacters(from, to) : mainCharacter[parseInt(from)];
        const main_characters = (mainCharacter[inputRange] === undefined)? await getMainCharacters(data_name, mode, from, to) : mainCharacter[inputRange];
        const nodes = new Set();
        const links = new Set();
        for(const character of main_characters) {
            const combineGraph = await getCombineGraph(data_name, character, from, to, "union", mode);
            combineGraph.nodes.forEach((node) => nodes.add(JSON.stringify(node)));
            combineGraph.links.forEach((edge) => links.add(JSON.stringify(edge)));
        }
        const formattedNodeSet = [...nodes].map((item) => {
            if (typeof item === 'string') return JSON.parse(item);
            else if (typeof item === 'object') return item;
        });
        const formattedLinkSet = [...links].map((item) => {
            if (typeof item === 'string') return JSON.parse(item);
            else if (typeof item === 'object') return item;
        });

        const linksArray = Array.from(formattedLinkSet);
        const nodesArray = Array.from(formattedNodeSet);
        
        // const simulation = d3.forceSimulation(nodesArray)
        // .force("link", d3.forceLink(linksArray).id(d => d.id).distance(d => 50))
        // .force("charge", d3.forceManyBody())
        // .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
        // // .randomSource(() => 0.5)
        // .alphaDecay(0.05);


        graphs.push({
            time: from,
            from: from,
            to: to,
            nodes: Array.from(formattedNodeSet),
            links: Array.from(formattedLinkSet),
            timepoints : range.length,
        });
    
	};
	return graphs;
}

export async function getSubRange(data_name, from, to, character, mode) {
    let filter = '';
    if(character) {
        filter += `&id=${character.replaceAll("_", " ")}`;
    }
    if(mode) {
        filter += `&mode=${mode}`;
    }
    const response = await fetch(`/api/sub-range?data_name=${data_name}&from=${from}&to=${to}${filter}`);
    const data = await response.json();
    return data;
}

export async function getChangeNeighboursAllNodes(data_name, ids, from, to, type, mode) {
    const nodes = new Set();
    const links = new Set();
    for(const id of ids) {
        const graph = await getChangeNeighbours(data_name, id, from, to, type, mode);
        graph.nodes.forEach((node) => nodes.add(JSON.stringify(node)));
        graph.links.forEach((edge) => links.add(JSON.stringify(edge)));
    }
    const formattedNodeSet = [...nodes].map((item) => {
        if (typeof item === 'string') return JSON.parse(item);
        else if (typeof item === 'object') return item;
    });
    const formattedLinkSet = [...links].map((item) => {
        if (typeof item === 'string') return JSON.parse(item);
        else if (typeof item === 'object') return item;
    });

    return {
        from, to,
        nodes: Array.from(formattedNodeSet),
        links: Array.from(formattedLinkSet),
    }

}

export async function getAllCombinedGraphs(data_name, ids, from, to, type, mode) {
    const nodes = new Set();
    const links = new Set();
    for(const id of ids) {
        const graph = await getCombineGraph(data_name, id, from, to, type, mode);
        graph.nodes.forEach((node) => nodes.add(JSON.stringify(node)));
        graph.links.forEach((edge) => links.add(JSON.stringify(edge)));
    }
    const formattedNodeSet = [...nodes].map((item) => {
        if (typeof item === 'string') return JSON.parse(item);
        else if (typeof item === 'object') return item;
    });
    const formattedLinkSet = [...links].map((item) => {
        if (typeof item === 'string') return JSON.parse(item);
        else if (typeof item === 'object') return item;
    });

    return {
        from, to,
        nodes: Array.from(formattedNodeSet),
        links: Array.from(formattedLinkSet),
    }

}

export async function getCommunityChange(data_name, ids, category, from, to) {
    let query_list = "";
    for(const id of ids) {
        query_list += `q=${id}&`;
    }
    let filter = '';
    if(category !== "louvain") {
        filter = filter + `&category=${category}`;
    }
    if(from) {
        filter = filter + `&_from=${from}`;
    }
    if(to) {
        filter = filter + `&_to=${to}`;
    }
    const url = `/api/community-change?data_name=${data_name}&${query_list}&${filter}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// TODO: WE NEED TO CONSIDER DIRECTED GRAPH
export function getSupporter (links, mainCharacters, value){
	const nodeSums = {};
	for(let target of mainCharacters) {
		target = target.replaceAll(" ", "_");
		links.forEach(link => {
			if (link.source === target) {
				if (!nodeSums[link.target]) nodeSums[link.target] = 0;
					nodeSums[link.target] += link.value;
			} else if (link.target === target) {
				if (!nodeSums[link.source]) nodeSums[link.source] = 0;
					nodeSums[link.source] += link.value;
			}
		});
	}
	const allNodes = Object.entries(nodeSums).map(([node, sum]) => ({id: node, weight: sum}));
	allNodes.sort((a, b) => b.weight - a.weight);
	// const filteredNodes = allNodes.filter(node => node.num_links >= value);
    const topNodesCount = Math.ceil(allNodes.length * (value / 100));
    const filteredNodes = allNodes.slice(0, topNodesCount);
    return filteredNodes;
}