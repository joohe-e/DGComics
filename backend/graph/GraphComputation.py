import json


def getCenterNode(nodes):
    """
    Returns the center node of the graph
    """
    return max(nodes, key=lambda x: x["eigenvector_centrality"])

def get_ego(data, id, year):
    data_year = list(filter(lambda x: x["time"] == int(year), data))[0]
    new_links = []
    set_nodes = set()
    node_present = False
    for node in data_year["nodes"]:
        if node["id"] == id:
            node_present = True
            break

    for link in data_year["links"]:
        if link["source"] == id:
            new_links.append(link)
            set_nodes.add(link["target"])
        elif link["target"] == id:
            new_links.append(link)
            set_nodes.add(link["source"])
        else :
            continue

    set_nodes.add(id)
    new_nodes = list(set_nodes)
    return {
        "time": year,
        "node_present": node_present,
        "nodes": new_nodes,
        "links": new_links
    }
    ...

def get_neighbor(data, id, year):

    data_year = list(filter(lambda x: x["time"] == int(year), data))[0]
    new_links = []
    set_nodes = set()
    node_present = False
    for node in data_year["nodes"]:
        if node["id"] == id:
            node_present = True
            break

    for link in data_year["links"]:
        if link["source"] == id:
            new_links.append(link)
            set_nodes.add(link["target"])
        elif link["target"] == id:
            new_links.append(link)
            set_nodes.add(link["source"])
        else :
            continue
    
    neighbor_links = []
    for link in data_year["links"]:
        if link["source"] in set_nodes and link["target"] in set_nodes:
            neighbor_links.append(link)

    set_nodes.add(id)
    new_nodes = list(set_nodes)

    return {
        "time": year,
        "node_present": node_present,
        "nodes": new_nodes,
        "links": new_links + neighbor_links
    }

def get_community(data, id, year):

    with open("./comm_lists-coauthor.json", encoding='UTF8') as f:
        community_list = json.load(f)

    with open("./partition_lists-coauthor.json", encoding='UTF8') as f:
        partition_list = json.load(f)

    data_year = list(filter(lambda x: x["time"] == int(year), data))[0]

    year = str(year)
    new_links = []
    set_nodes = set([id])
    node_present = False

    for node in data_year["nodes"]:
        if node["id"] == id:
            node_present = True
            break

    try:
        partition_group = str(partition_list[year][id.replace("_", " ")])
        community = community_list[year]
    except KeyError:
        new_nodes = list(set_nodes)
        return {
            "time": year,
            "node_present": node_present,
            "nodes": new_nodes,
            "links": new_links
        }

    for link in data_year["links"]:
        if link["source"].replace("_", " ") not in community[partition_group]:
            continue
        if link["target"].replace("_", " ") not in community[partition_group]:
            continue
        new_links.append(link)
        set_nodes.add(link["source"])
        set_nodes.add(link["target"])

    new_nodes = list(set_nodes)
    
    return {
        "time": year,
        "node_present": node_present,
        "nodes": new_nodes,
        "links": new_links
    }
    
def get_subgraph_by_mode(data, mode, id, year):
    if mode == "ego":
        return get_ego(data, id, year)
    if mode == "community":
        return get_community(data, id, year)
    if mode == "neighbor":
        return get_neighbor(data, id, year)
    return {}