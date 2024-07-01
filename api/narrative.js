// To do: dealing with multiple supporting character, when the year is only one

export function generateNarrativeForAll(main, full, add, del, from, to) {
  let narratives = []; 

  main.forEach(mainCharacter => {
    const narrative = generateNarrative(mainCharacter, full, add, del, from, to); 
    narratives.push(narrative);
  });

  const combinedNarrative = combineClauses(main, narratives); 
  
  return combinedNarrative;
}

function combineClauses(main, narratives){
  // const clause0 = mergeNarrativesByClause(main, narratives, "clause0");
  const clause0 = narratives[0].clause0;
  const clause1 = mergeNarrativesByClause(main, narratives, "clause1");
  const clause2 = mergeNarrativesByClause(main, narratives, "clause2");
  const clause3 = mergeNarrativesByClause(main, narratives, "clause3");

  const multiSub = (sub) => { return sub.slice(0, -1).join(', ') + (sub.length > 1 ? ', and ' : '') + sub.slice(-1)};

  const getSentence = (dict) => {
    if(!dict.length) return '';
    const sentences = dict.map(narrative => {
      const subjects = multiSub(narrative.subject)
      return `${subjects} ${narrative.clause}`; // Adjust based on available clauses
    });

    return sentences.join(' ');
  }

  const getClause2 = (dict) => {
    if(!dict.length) return '';
    const sentences = dict.map(narrative => {
      return `${narrative.clause}`; // Adjust based on available clauses
    });
    const concat = multiSub(sentences);
    return  `Most of the relationships ${concat}.`;
  }

  return clause0 + ` ${getSentence(clause1)}` + ` ${getClause2(clause2)}` + ` ${getSentence(clause3)}`;
}

function mergeNarrativesByClause(mains, narratives, clauseKey) {
  const clauseGroups = {};

  narratives.forEach((narrative, index) => {
    const name = mains[index];
    const clauseValue = narrative[clauseKey];
    if(!clauseValue) return;

    if (clauseGroups[clauseValue]) {
      clauseGroups[clauseValue].subject.push(name);
    } else {
      clauseGroups[clauseValue] = { subject: [name], clause: clauseValue };
    }
  });

  return Object.values(clauseGroups);
}


function generateNarrative (main, full, add, del, from, to) {
    const timeDif = parseInt(full.to, 10) - parseInt(full.from, 10);
    const numDel = del.nodes.length; 
    const numAdd = add.nodes.length;
    const numFix = full.nodes.length - numDel - numAdd - 1;
    const maxNum = Math.max(numDel, numAdd, numFix);
    const mainCharacter = main.replaceAll(" ", "_");
    // const numMain = main.length;
    // const numFix = full.nodes.length - numDel - numAdd - numMain;
    // const maxNum = Math.max(numDel, numAdd, numFix);
    // const mainCharacter = main.slice(0, -1).join(', ') + (main.length > 1 ? ', and ' : '') + main.slice(-1);

    const fullFiltered = filterList(full.links, mainCharacter);
    if(fullFiltered.length == 0) return {clause0: "", clause1: "", clause2: "", clause3: ""};


    let clause0, clause1, clause2, clause3 = "";
    // clause0 for time,
    if(timeDif == 0){
      clause0 = `In ${full.from}, `; 
      const topFull = getTopElementByTag(fullFiltered, "value");
      // const supporter = mainCharacter == topFull.source ? topFull.target.replaceAll('_', ' ') : topFull.source.replaceAll('_', ' ');
      const supporterList = getSupporters(fullFiltered, mainCharacter, topFull.value);
      const supporter = supporterList.slice(0, -1).join(', ') + (supporterList.length > 1 ? ', and ' : '') + supporterList.slice(-1);
      clause1 = ` had the strong relationship with ${supporter.replaceAll('_', ' ')}.`;
      return {
        clause0: clause0, 
        clause1: clause1
      };
    } else if(timeDif == 1) {
      clause0 = `From ${full.from} to ${full.to}, `; 
    } else {
      clause0 = `Before and after ${add.to.split("-")[0]}, `;
    }

    // check whether main.length > 1 --> if yes, integrate the summaries
    // get multiple supporting characters if there are

    const differences = computeDif(from.links, to.links);

    const difFiltered = filterList(differences, mainCharacter);
    const topDif = getTopElementByTag(difFiltered, "value");
    const topList = getAllTopElementsByTag(difFiltered, "value")

    const addFiltered = filterList(add.links, mainCharacter);
    const topAdd = getTopElementByTag(addFiltered, "value");

    const delFiltered = filterList(del.links, mainCharacter);
    const topDel = getTopElementByTag(delFiltered, "value");

    const maxDif = getGreatestBy(topDif, topAdd, topDel);

    if (numAdd > numDel) {
        clause1 = ' had expanded the network.';
    } else if (numAdd < numDel) {
        clause1 = ' had shrunk the network.';
    } else {
        clause1 = ' had maintained the network.';
    }
    
    if (numFix == maxNum) {
      clause2  = "were preserved"
    } if (numAdd == maxNum) {
      clause2 ? clause2 += " or newly added" : clause2 = "were newly added"
    } if (numDel == maxNum) {
      clause2 ? clause2 += " or disappeared" : clause2 = "were disappeared"
    }
    // clause2 = `Most of the relationships ${clause2}.`
    
    if(maxDif.element){
      // const supporter = mainCharacter == maxDif.element.source ? maxDif.element.target.replaceAll('_', ' ') : maxDif.element.source.replaceAll('_', ' ');  
      if (maxDif.key == "dif") {
        const supporterList = getSupporters(difFiltered, mainCharacter, maxDif.value);
        const supporter = supporterList.slice(0, -1).join(', ') + (supporterList.length > 1 ? ', and ' : '') + supporterList.slice(-1);
        if (maxDif.element.value < 0){
          clause3 = ` had weakened the relationship(s) with ${supporter.replaceAll('_', ' ')}.`
        } else if (maxDif.element.value > 0){
          clause3 = ` had strengthened the relationship(s) with ${supporter.replaceAll('_', ' ')}.`
        }
      } else if (maxDif.key == "add") {
          const supporterList = getSupporters(addFiltered, mainCharacter, maxDif.value);
          const supporter = supporterList.slice(0, -1).join(', ') + (supporterList.length > 1 ? ', and ' : '') + supporterList.slice(-1);
          clause3 = ` had newly established the strong relationship(s) with ${supporter.replaceAll('_', ' ')}.`;
      } else if (maxDif.key == "del") {
        const supporterList = getSupporters(delFiltered, mainCharacter, maxDif.value);
        const supporter = supporterList.slice(0, -1).join(', ') + (supporterList.length > 1 ? ', and ' : '') + supporterList.slice(-1);
        clause3 = ` had lost the strong relationship(s) with ${supporter.replaceAll('_', ' ')}.`;
      } 
  }

    // const narrative = clause0 + " " + clause1 + " " + clause2 + " " + clause3;
    const narrative = {
      clause0 : clause0,
      clause1 : clause1,
      clause2 : clause2,
      clause3 : clause3,
    }

    return narrative;

}

function computeDif(listFrom, listTo) {
  // Create a map from the first list for quick lookup
  const fromMap = new Map(listFrom.map(link => [link.source + '-' + link.target, link.value]));

  // Iterate over the second list and compute differences
  const differences = listTo.map(link => {
    const key = link.source + '-' + link.target;
    const fromValue = fromMap.get(key) || 0; // Default to 0 if not found in the map
    const difference = link.value - fromValue; // Compute the difference

    // Return a new object maintaining original source and target, including the difference
    return {
      source: link.source,
      target: link.target,
      value: difference // Include the computed difference
    };
  });

  return differences;
}

function getTopElementByTag(list, tag) {
  return list.reduce((max, item) => {
    return (max === null || item[tag] > max[tag]) ? item : max;
  }, null);
}

function filterList(list, mainCharacter) {
  return list.filter((link) => {
    return link.source == mainCharacter || link.target == mainCharacter;
  });
}

function getSupporters(list, mainCharacter, value) {
  return list.filter(el => el.value === value && (el.source === mainCharacter || el.target === mainCharacter))
             .map(el => el.source === mainCharacter ? el.target : el.source);
}

function getGreatestBy(topDif, topAdd, topDel) {

  const elements = [
    { key: "dif", element: topDif, value: topDif ? Math.abs(topDif.value) : null}, 
    { key: "add", element: topAdd, value: topAdd ? Math.abs(topAdd.value) : null},
    { key: "del", element: topDel, value: topDel ? Math.abs(topDel.value) : null}
  ];

  const biggest = elements.reduce((max, current) => {
    return (max.value === null || current.value > max.value) ? current : max;
  }, {element: null, value: null});

  return biggest;
}

function getAllTopElementsByTag(list, tag) {
  return list.reduce((maxItems, item) => {
    if (!maxItems.length) {
      return [item];
    } else if (item[tag] > maxItems[0][tag]) {
      return [item];
    } else if (item[tag] === maxItems[0][tag]) {
      maxItems.push(item);
    }
    return maxItems;
  }, []);
}

export async function improveNarrative(data_name, narrative){

  const url = `/api/improve-narrative?data_name=${data_name}`;

  const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({narrative: narrative}),
  });

  const reader = response.body.getReader();
  return reader;
}