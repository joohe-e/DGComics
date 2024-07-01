import json
import os
from typing import Union
from config import APIConfig, SankeyConfig
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Query
import numpy as np
from data.data import DataManager

from graph.GraphHierarchy import clustering_with_preserved_order, linkage_to_json
from graph.GraphComputation import getCenterNode, get_subgraph_by_mode

app = FastAPI()

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Should delete the data out of the list after update
list_of_under_maintenance_data = [
    "vispub-coauthor-backup",
    "vispub-citation",
    "vevo",
]


graph_data = {}
table_data = {}
labels = {}
main_character_data = {}

DATA_MANAGER = DataManager()

@app.get("/all-data")
def get_all_data():
    all_data = [name for name in os.listdir("data") if os.path.isdir(os.path.join("data", name)) and name != "__pycache__" and name not in list_of_under_maintenance_data]
    return all_data

@app.get("/data-range/{data_name}")
def get_all_data(data_name: str):
    try:
        first_time = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
        last_time = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]

        return {
            "from": first_time,
            "to": last_time
        }
    except:
        return {
            "from": 0,
            "to": 0
        }


@app.get("/hierarchy/{data_name}")
def get_graph(data_name: str, _from: int=None, _to: int=None):
    if _from is None and _to is None:
        return DATA_MANAGER.load_hierarchy_overview_data(data_name)
    
    first_time = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
    last_time = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]
    if _from is None:
        _from = first_time
    if _to is None:
        _to = last_time

    if _from >= _to or _from < first_time or _to > last_time:
        return {}
    
    new_from = _from - first_time
    new_to = _to - first_time

    distance_matrix = DATA_MANAGER.load_distance_matrix_by_time(data_name, new_from, new_to)
    linked = clustering_with_preserved_order(1 - distance_matrix)
    if(linked[:, 2].max() != linked[:, 2].min()):
        linked[:, 2] = (linked[:, 2] - linked[:, 2].min()) / (linked[:, 2].max() - linked[:, 2].min())
    return linkage_to_json(linked, list(range(_from, _to + 1)))
    

@app.get("/total/{data_name}/{type}")
def get_total(data_name: str, type: str, _from: int=None, _to: int=None):
    if _from is None:
        _from = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
    if _to is None:
        _to = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]

    try:
        data = DATA_MANAGER.load_graph_data(data_name)

        all_node_ids = set()
        all_times = set()

        for item in data:
            if item["time"] < _from or item["time"] > _to:
                continue

            for node in item.get("nodes", []):
                all_node_ids.add(node["id"])

            all_times.add(item["time"]) 

        if type == "node":
            return list(all_node_ids)
        elif type == "time":
            return sorted(list(all_times))
        elif type == "all":
            return data
        else:
            print("Error: Invalid type parameter. Use 'node' or 'year'.")
            return []

    except FileNotFoundError:
        print("Error: vis-pub-data.json not found.")
        return []

    except Exception as e:
        print(f"Error: {e}")
        return []

@app.get("/table/{data_name}")
def get_info(data_name: str, _from: int = 0, _to: int = 0, all: bool = False, skip1: bool = False):
    table_data = DATA_MANAGER.load_table_data(data_name)
    
    if all:
        return {key: value for key, value in table_data.items() if len(value) > 1 or not skip1}
    
    res = {key: list(filter(lambda x: _from <= x["time"] <= _to, value)) for key, value in table_data.items()}
    return {key: value for key, value in res.items() if len(value) > 0}

@app.get("/category/{data_name}")
def get_category(data_name: str, _from: int = 0, _to: int = 0, attribute: str = ""):
    table_data = DATA_MANAGER.load_table_data(data_name)

    res = {key: list(filter(lambda x: _from <= x["time"] <= _to, value)) for key, value in table_data.items()}

    if attribute == "":
        result = {}
        res = {key: list(map(lambda x: x["category"], value)) for key, value in res.items() if len(value) > 0}
        for key in res:
            result[key] = {}
            for category in res[key]:
                for attribute, value in category.items():
                    if attribute not in result[key]:
                        result[key][attribute] = set()
                    for c in value:
                        result[key][attribute].add(' '.join(c.split()))
        for key in result:
            for attribute in result[key]:
                result[key][attribute] = list(result[key][attribute])
        return result

    res = {key: list(map(lambda x: x["category"][attribute], value)) for key, value in res.items() if len(value) > 0}
    
    for key in res:
        unique_attributes = set()
        for attributes in res[key]:
            for attribute in attributes:
                unique_attributes.add(' '.join(attribute.split()))
        res[key] = list(unique_attributes)
    return res

def convert_dissim():
    with open("./nodewise_dissim.json", encoding='UTF8') as f:
        data = json.load(f)

    transformed_data = {}

    for entry in data:
        for name, distance in entry["distance"].items():
            if name not in transformed_data:
                transformed_data[name] = []
            transformed_data[name].append({
                "distance": distance,
                "from": entry["from"],
                "to": entry["to"]
            })
    return transformed_data

@app.get("/dissim/{data_name}/{mode}") 
def get_dissim(data_name: str, mode: str, _from: int = None, _to: int = None):
    if _from is None:
        _from = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
    if _to is None:
        _to = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]
    
    if _from > _to:
        return {}
    
    dissim = DATA_MANAGER.load_dissim_data(data_name, mode)

    # Filter the dissimilarity data based on the specified year range
    for key in dissim:
        if key == "metadata":
            continue
        dissim[key] = list(filter(lambda x: _from <= x["from"] and x["to"] <= _to, dissim[key]))

    return dissim

def get_table():
    node_list = get_total("node")
    total_list = get_total("all")
    data = {}

    node_dict = {}
    for entry in total_list:
        for node in entry["nodes"]:
            node_id = node["id"]
            time = entry["time"]
            node["time"] = time 
            if node_id not in node_dict:
                node_dict[node_id] = []
            node_dict[node_id].append(node)  

    for item in node_list:
        if item in node_dict:
            data[item] = node_dict[item]

    return data

@app.get("/graph/{data_name}/{year}")
def get_graph_new(data_name: str, year: int):
    graph_data = DATA_MANAGER.load_graph_data(data_name)
    try:
        return list(filter(lambda d: d["time"] == year, graph_data))
    except ValueError:
        return [{ 
            "time": "None",
            "nodes": [],
            "links": [],
        }]


@app.get("/main-character/{data_name}/{mode}/{id}")
def get_main_character_hierarchy(data_name: str, mode: str, id: str, _from: int=None, _to: int=None):
    main_character_data, labels = DATA_MANAGER.load_main_character_hierarchy_data(data_name, mode)

    first_time = labels[id][0]
    last_time = labels[id][-1]
    if _from is None or _from < first_time:
        _from = first_time
    if _to is None or _to > last_time:
        _to = last_time

    if _from >= _to:
        return {}
    
    labels_id = list(filter(lambda x: _from <= x and x <= _to, labels[id]))

    new_from = _from - first_time
    new_to = new_from + len(labels_id) - 1

    try:
        distance_matrix = main_character_data[id][new_from:new_to+1, new_from:new_to+1]
        linked = clustering_with_preserved_order(1 - distance_matrix)
        if(linked[:, 2].max() != linked[:, 2].min()):
            linked[:, 2] = (linked[:, 2] - linked[:, 2].min()) / (linked[:, 2].max() - linked[:, 2].min())
        return linkage_to_json(linked, labels_id, _from, _to)
    except KeyError:
        return {}

@app.get("/center/{data_name}/{mode}/{_from}/{_to}")
def get_center(data_name, mode,_from, _to): 
    data = DATA_MANAGER.load_year_lists_data(data_name, mode)

    if _from == _to:
        graph_data = DATA_MANAGER.load_graph_data(data_name)
        graph = list(filter(lambda d: d["time"] == int(_from), graph_data))[0]
        return [getCenterNode(graph["nodes"])["label"]]

    matching_dict = None

    for dictionary in data:
        if dictionary.get("from") == int(_from) and dictionary.get("to") == int(_to):
            matching_dict = dictionary
            break

    distance = matching_dict["distance"]
    if distance:
        max_value = max(distance.values())
        # max_value_key = max(matching_dict, key=matching_dict.get)
        max_value_keys = [key for key, value in distance.items() if value == max_value]

        return max_value_keys
    else:
        print("No matching dictionary found for the specified year range.")
        return []
    
@app.get("/subgraph/{data_name}/{mode}/{id}/{year}")
def get_subgraph(data_name, mode, id, year):
    data = DATA_MANAGER.load_graph_data(data_name)

    return get_subgraph_by_mode(data, mode, id, year)
    
@app.get("/subgraph_set/{data_name}/{mode}/{id}/{_from}/{_to}/{type}")
def get_subgraph_set(data_name, mode, id, _from, _to, type):

    # If high performance mode is enabled, use the C++ implementation
    if APIConfig.HIGH_PERFORMANCE_MODE:
        graphSim = DATA_MANAGER.load_high_performance_graph(data_name)
        subgraph_set = graphSim.get_subgraph_set(mode, id, int(_from), int(_to))

        return {
            "from": subgraph_set._from,
            "to": subgraph_set._to,
            "nodes": subgraph_set.nodes,
            "links": [{
                "source": link.source,
                "target": link.target,
                "is_directed": link.is_directed,
                "value": link.value,
            } for link in subgraph_set.links],
        }

    # If high performance mode is disable, just use the old Python code
    data = DATA_MANAGER.load_graph_data(data_name)

    if type == "union":
        node_set = set()
        union_link = []
        link_set = set()
        for i in range(int(_from), int(_to) + 1):
            neighbor = get_subgraph_by_mode(data, mode, id, i)
            for node in neighbor["nodes"]:
                node_set.add(node)

            for link in neighbor["links"]:
                source = link["source"]
                target = link["target"] 
                value = link["value"]
                if (source, target) in link_set or (target, source) in link_set:
                    for existing_link in union_link:
                        if (existing_link["source"] == source and existing_link["target"] == target) or \
                        (not existing_link["is_directed"] and existing_link["source"] == target and existing_link["target"] == source):
                            existing_link["value"] += value
                            break
                else:
                    link_set.add((source, target))
                    union_link.append(link.copy())

        combined_data = {
            "from": _from,
            "to": _to,
            "nodes": list(node_set),
            "links": union_link
        }

    elif type == "intersection":
        node_set = None
        link_set = set()

        # Initialize node_set with the nodes of the first year
        first_year_neighbor = get_subgraph_by_mode(data, mode, id, int(_from))
        node_set = set(node for node in first_year_neighbor["nodes"])

        # Loop through the remaining years and update the node_set by intersecting with each year's nodes
        for i in range(int(_from) + 1, int(_to) + 1):
            neighbor = get_subgraph_by_mode(data, mode, id, i)
            year_nodes = set(node for node in neighbor["nodes"])
            node_set.intersection_update(year_nodes)

        # Loop through the years to calculate the intersection of links
        link_set = set((link["source"], link["target"]) for link in first_year_neighbor["links"])
        link_set = set(map(tuple, map(sorted, link_set)))
        for i in range(int(_from) + 1, int(_to) + 1):
            neighbor = get_subgraph_by_mode(data, mode, id, i)
            current_year_link_set = set((link["source"], link["target"]) for link in neighbor["links"])
            current_year_link_set = set(map(tuple, map(sorted, current_year_link_set)))
            link_set.intersection_update(current_year_link_set)

        # Create a combined dictionary of nodes and set of unique links
        combined_data = {
            "from": _from,
            "to": _to,
            "nodes": list(node_set),
            "links": [{"source": source, "target": target, "value": 1} for source, target in link_set]
        }

    return combined_data

# if the format of _from or _to is year-yaer, get the union
@app.get("/difference/{data_name}/{mode}/{id}/{_from}/{_to}/{type}")
def get_dif(data_name, mode, id, _from, _to, type):
    data = DATA_MANAGER.load_graph_data(data_name)

    node_set_from = set()
    link_data_from = {}  # Dictionary to capture the link value
    link_set_from = set()
    node_set_to = set()
    link_data_to = {}  # Dictionary to capture the link value for _to
    link_set_to = set()
    is_directed = False

    def canonical_order(source, target):
        return (min(source, target), max(source, target))
    
    # Get nodes and links from _from
    if '-' in str(_from):
        start, end = map(int, _from.split('-'))
        neighbor_from = get_subgraph_set(data_name, mode, id, start, end, "union")
    else:
        neighbor_from = get_subgraph_by_mode(data, mode, id, int(_from))

    for node in neighbor_from["nodes"]:
        node_set_from.add(node)
    for link in neighbor_from["links"]:
        if link["is_directed"]:
            is_directed = True
            order = (link["source"], link["target"])
        else:
            order = canonical_order(link["source"], link["target"])
        link_set_from.add(order)
        link_data_from[order] = link["value"]  # Capture the link value
        
    # Get nodes and links from _to
    if '-' in str(_to):
        start, end = map(int, _to.split('-'))
        neighbor_to = get_subgraph_set(data_name, mode, id, start, end, "union")
    else:
        neighbor_to = get_subgraph_by_mode(data, mode, id, int(_to))

    for node in neighbor_to["nodes"]:
        node_set_to.add(node)
    for link in neighbor_to["links"]:
        if link["is_directed"]:
            is_directed = True
            order = (link["source"], link["target"])
        else:
            order = canonical_order(link["source"], link["target"])
        link_set_to.add(order)
        link_data_to[order] = link["value"]  # Capture the link value

    combined_data = {}

    if type == "delete":
        # Difference operation for delete
        node_diff = node_set_from - node_set_to
        link_diff = link_set_from - link_set_to

        # Return the data using captured link values from _from
        combined_data = {
            "from": _from,
            "to": _to,
            "nodes": list(node_diff),
            "links": [{"source": source, "target": target, "is_directed": is_directed, "value": link_data_from[(source, target)]} for source, target in link_diff]
        }

    elif type == "add":
        # Difference operation for add
        node_diff = node_set_to - node_set_from
        link_diff = link_set_to - link_set_from

        # Return the data using captured link values from _to
        combined_data = {
            "from": _from,
            "to": _to,
            "nodes": list(node_diff),
            "links": [{"source": source, "target": target, "is_directed": is_directed, "value": link_data_to[(source, target)]} for source, target in link_diff]
        }

    return combined_data

@app.get("/sub-range/{data_name}")
def get_subrange_difference(data_name: str, _from: int, _to: int, mode: str, id: str | None=None):
    if id is None:
        hierarchy = get_graph(data_name, _from, _to)
    else:
        hierarchy = get_main_character_hierarchy(data_name, mode, id, _from, _to)

    first_half = hierarchy["children"][0]["name"]
    second_half = hierarchy["children"][-1]["name"]

    if '-' in first_half:
        splitted = first_half.split('-')
        first_half = f"{splitted[0]}-{splitted[-1]}"
    if '-' in second_half:
        splitted = second_half.split('-')
        second_half = f"{splitted[0]}-{splitted[-1]}"    

    return {
        "from": first_half,
        "to": second_half
    }


@app.post("/sankey/{data_name}")
def get_sankey(data_name: str, sankey_config: SankeyConfig):
    q = sankey_config.q
    category = sankey_config.category
    _from = sankey_config.from_
    _to = sankey_config.to_

    if q is None:
        return {
            "nodes": [],
            "links": []
        }
    
    first_time = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
    last_time = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]
    if _from is None:
        _from = first_time
    if _to is None:
        _to = last_time

    if _from >= _to or _from < first_time or _to > last_time:
        return {
            "nodes": [],
            "links": []
        }
    
    # Louvain community view
    if category is None:
        sankey = DATA_MANAGER.load_sankey_data(data_name)
        partition = DATA_MANAGER.load_partition_lists_data(data_name)

        community_set = set()
        for year in partition.keys():
            if int(year) < _from or int(year) > _to:
                continue
            for character in q:
                if character in partition[year]:
                    community_set.add(partition[year][character])

        return {
            "nodes": list(filter(lambda x: x["id"] in community_set, sankey["nodes"])),
            "links": list(filter(lambda x: x["source"] in community_set and x["target"] in community_set, sankey["links"]))
        }
    
    # Category view
    table = DATA_MANAGER.load_table_data(data_name)
    set_q = set(q)
    time_based = {}
    filtered_character = list(filter(lambda x: x.replace("_", " ") in set_q, table.keys()))
    for character in filtered_character:
        info_list = list(filter(lambda x: _from <= x["time"] and x["time"] <= _to, table[character]))

        for info in info_list:
            time = info["time"]
            if time not in time_based:
                time_based[time] = {}
            comm = f"{time}-{info['category'][category][0]}"
            if comm not in time_based[time]:
                time_based[time][comm] = []
            time_based[time][comm].append(character)

    # Initialize empty lists for nodes and links
    nodes = []
    links = []

    # Create nodes and add to the list
    for year, community in time_based.items():
        for community_number, node_list in community.items():
            node_name = f"{community_number}"
            if node_name not in nodes:
                nodes.append({"id": node_name, "value": len(node_list)})

    # Initialize a variable to store previous year data
    previous_year_data = {}

    # Create links and add to the list
    for year, communities in sorted(time_based.items()):
        current_year_data = {}
        for community_number, ids in communities.items():
            community_node_name = f"{community_number}"
            for id_ in ids:
                current_year_data[id_] = community_node_name
                
                # If this id was also present in the previous year, create a link
                if id_ in previous_year_data:
                    source = previous_year_data[id_]
                    target = community_node_name

                    # Check if this link already exists, if yes, increment the value, else add a new link
                    link_exists = False
                    for link in links:
                        if link['source'] == source and link['target'] == target:
                            link['value'] += 1
                            link_exists = True
                            break
                    
                    if not link_exists:
                        links.append({"source": source, "target": target, "value": 1})
        
        previous_year_data = current_year_data

    # Final result
    return {
        "nodes": nodes,
        "links": links
    }



@app.get("/comm/{data_name}/{time}/{div}")
def get_community(data_name: str, time: int, div: str, category: str=None):
    if category is None:
        data = DATA_MANAGER.load_comm_lists_data(data_name)
        return data[str(time)][div]
    table = DATA_MANAGER.load_table_data(data_name)
    data = {}
    filtered_character = table.keys()
    for character in filtered_character:
        info_list = list(filter(lambda x: x["time"] == time, table[character]))
        for info in info_list:
            infotime = info["time"]
            if infotime not in data:
                data[infotime] = {}
            comm = f"{infotime}-{info['category'][category][0]}"
            if comm not in data[infotime]:
                data[infotime][comm] = []
            data[infotime][comm].append(character.replace("_", " "))
    return data[time][div]
    

@app.get("/part/{data_name}/{time}/{id}")
def get_partition(data_name: str, time, id):
    data = DATA_MANAGER.load_partition_lists_data(data_name)
    return data[time][id]

@app.get("/community_change/{data_name}")
async def get_community_change(data_name: str, category: str=None, q: list[str] | None = Query(default=None), _from: int = None, _to: int = None):
    if q is None:
        return {}
        
    first_time = DATA_MANAGER.load_graph_data(data_name)[0]["time"]
    last_time = DATA_MANAGER.load_graph_data(data_name)[-1]["time"]
    if _from is None:
        _from = first_time
    if _to is None:
        _to = last_time
    
    if _from > _to:
        return {}
    
    # Louvain view
    if category is None:
        data = DATA_MANAGER.load_partition_lists_data(data_name)
    else:
        table = DATA_MANAGER.load_table_data(data_name)
        set_q = set(q)
        data = {}
        filtered_character = list(filter(lambda x: x in set_q, table.keys()))
        for character in filtered_character:
            info_list = list(filter(lambda x: _from <= x["time"] and x["time"] <= _to, table[character]))
            for info in info_list:
                time = str(info["time"])
                if time not in data:
                    data[time] = {}
                comm = f"{time}-{info['category'][category][0]}"
                data[time][character.replace("_", " ")] = comm

    result = {}
    for year in range(_from, _to + 1):
        if str(year) not in data:
            continue
        comm = data[str(year)]
        for node in q:
            node = node.replace("_", " ")
            if node not in comm:
                continue
            if node not in result:
                result[node] = []
            result[node].append(f"{comm[node]}")

    return result

