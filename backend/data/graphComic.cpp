#ifndef DEBUG
#include <pybind11/pybind11.h>
#endif
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <algorithm>
#include <cstdlib>
#include <map>
#include <set>
#include <array>
#include <iomanip>
#include <chrono>
#include "json.hpp"
#ifndef DEBUG
#include <pybind11/stl.h>

namespace py = pybind11;
#endif

using json = nlohmann::json;


typedef std::vector<double> ArrayDouble;
typedef std::vector<int> ArrayInt;
typedef std::vector<bool> ArrayBool;
typedef std::pair<int, int> Pii;

typedef std::vector<ArrayInt> AdjList;
typedef std::vector<ArrayDouble> GraphEdgesMap;

typedef std::set<int> GraphNodesSet;
typedef std::set<Pii> GraphEdgesSet;

typedef std::vector<ArrayDouble> Matrix;


struct Edge{
    std::string source;
    std::string target;
    bool is_directed;
    double value;
};


struct SubGraph{
    int time;
    bool node_present;
    ArrayInt nodes;
    std::vector<Pii> links;
};


struct SubgraphSet {
    int from, to;
    GraphNodesSet nodes;
    GraphEdgesSet links;
};


struct SubgraphVector {
    int from, to;
    std::vector<std::string> nodes;
    std::vector<Edge> links;
};


class GraphSimilarity {
private:
    int totalNodeCount;
    int firstTime, lastTime;
    bool is_directed_graph;
    std::map<std::string, int> mapNodeToInt;
    std::vector<std::string> mapIntToNode;
    std::vector<GraphEdgesMap> graphMaps;
    std::vector<GraphEdgesSet> graphSets;
    std::vector<AdjList> adjNodes;
    std::vector<ArrayBool> checkNode;

    GraphEdgesSet intersection(GraphEdgesSet &set1, GraphEdgesSet &set2) {
        GraphEdgesSet intersect;
        std::set_intersection(set1.begin(), set1.end(), set2.begin(), set2.end(), 
                            std::inserter(intersect, intersect.begin()));
        return intersect;
    }
    double weighted_intersection(GraphEdgesMap &graphMap1, GraphEdgesMap &graphMap2, 
                             GraphEdgesSet &set1, GraphEdgesSet &set2, 
                             GraphEdgesSet& intersect) {
        double total_len = 0;
        for(auto it: intersect) {
            double e1 = graphMap1[it.first][it.second];
            double e2 = graphMap2[it.first][it.second];
            if(std::max(e1, e2) == 0) continue;
            total_len += std::min(e1, e2) / std::max(e1, e2);
        }
        return total_len;
    }

    void load_data(const json &data) {
        totalNodeCount = 0;
        for(auto graph: data) {
            for(auto node: graph["nodes"]) {
                std::string id = node["id"];
                if(mapNodeToInt.find(id) == mapNodeToInt.end()) {
                    mapIntToNode.push_back(id);
                    mapNodeToInt[id] = totalNodeCount++;
                }
            }
        }
        for(auto graph: data) {
            graphMaps.push_back(GraphEdgesMap(totalNodeCount));
            adjNodes.push_back(AdjList(totalNodeCount));
            checkNode.push_back(ArrayBool(totalNodeCount));

            for(auto &graphMap: graphMaps.back()) graphMap.reserve(totalNodeCount);
            graphSets.push_back(GraphEdgesSet());

            for(auto link: graph["links"]) {
                int u = mapNodeToInt[link["source"]];
                int v = mapNodeToInt[link["target"]];

                adjNodes.back()[u].push_back(v);

                checkNode.back()[u] = true;
                checkNode.back()[v] = false;

                graphMaps.back()[u][v] = double(link["value"]);
                graphSets.back().insert({ u, v });
            }
        }
    }

    SubGraph get_ego_subgraph(const int &id, const int &time) {
        bool node_present = checkNode[time][id];

        std::set<int> new_nodes;
        std::vector<Pii> new_links;

        for(auto link: graphSets[time]) {
            int u = link.first;
            int v = link.second;

            if(u == id) {
                new_links.push_back(link);
                new_nodes.insert(v);
            } else if(v == id) {
                new_links.push_back(link);
                new_nodes.insert(u);
            }
        }

        new_nodes.insert(id);
        return {
            time,
            node_present,
            ArrayInt(new_nodes.begin(), new_nodes.end()),
            new_links
        };
    }

    SubGraph get_neighbor_subgraph(const int &id, const int &time) {
        SubGraph network = get_ego_subgraph(id, time);
        std::set<int> new_nodes(network.nodes.begin(), network.nodes.end());

        new_nodes.erase(id);
        for(auto link: graphSets[time]) {
            int u = link.first;
            int v = link.second;

            if(new_nodes.find(u) != new_nodes.end() && new_nodes.find(v) != new_nodes.end()) {
                network.links.push_back(link);
            }
        }

        new_nodes.insert(id);
        network.nodes = ArrayInt(new_nodes.begin(), new_nodes.end());

        return network;        
    }

public:
    GraphSimilarity(): totalNodeCount(0), is_directed_graph(false) {}

    GraphSimilarity(const std::string &jsonPath): totalNodeCount(0) {
        std::ifstream fi(jsonPath);
        json data = json::parse(fi);
        firstTime = int(data[0]["time"]);
        lastTime = int(data[data.size() - 1]["time"]);
        is_directed_graph = bool(data[0]["links"][0]["is_directed"]);
        load_data(data);
        fi.close();
    }

    int get_num_time() { return graphSets.size(); }
    int get_first_time_point() { return firstTime; }
    int get_last_time_point() { return lastTime; }

    double jaccard_index(GraphEdgesMap &graphMap1, GraphEdgesMap &graphMap2,
                        GraphEdgesSet &set1, GraphEdgesSet &set2) {
        GraphEdgesSet intersect = intersection(set1, set2);
        size_t lenUnion = set1.size() + set2.size() - intersect.size();
        double lenIntersect = weighted_intersection(graphMap1, graphMap2, set1, set2, intersect);
        return lenIntersect / lenUnion;
    }

    Matrix compute_distance_matrix() {
        size_t n = graphSets.size();
        Matrix weighted_distance_matrix(n);
        for(size_t i = 0; i < n; i++) weighted_distance_matrix[i].resize(n);
        for(size_t i = 0; i < n; i++) {
            weighted_distance_matrix[i][i] = 0;
            for(size_t j = i + 1; j < n; j++) {
                double similarity = jaccard_index(graphMaps[i], graphMaps[j], graphSets[i], graphSets[j]);
                weighted_distance_matrix[i][j] = weighted_distance_matrix[j][i] = 1 - similarity;
            }
        }
        return weighted_distance_matrix;
    }

    SubgraphVector get_subgraph_set(const std::string mode, const std::string id, 
                                                           const int from, const int to) {
        SubgraphSet subgraph;
        GraphEdgesMap subgraphEdge(totalNodeCount);
        for(auto &edgeMap: subgraphEdge) {
            edgeMap.resize(totalNodeCount);
            std::fill(edgeMap.begin(), edgeMap.end(), 0);
        }

        for(int time = from - firstTime; time <= to - firstTime; time++) {
            SubGraph network;
            if(mode == "ego") network = get_ego_subgraph(mapNodeToInt[id], time);
            else network = get_neighbor_subgraph(mapNodeToInt[id], time);

            subgraph.nodes.insert(network.nodes.begin(), network.nodes.end());

            for(auto link: network.links) {
                int u = link.first;
                int v = link.second;
                double value = graphMaps[time][u][v];

                subgraph.links.insert(link);
                subgraphEdge[u][v] += value;
            }
        }

        std::vector<std::string> nodes(subgraph.nodes.size());
        int cnt = 0;
        for(auto node: subgraph.nodes) {
            nodes[cnt++] = mapIntToNode[node];
        }

        std::vector<Edge> links(subgraph.links.size());
        cnt = 0;
        for(auto link: subgraph.links) {
            links[cnt++] = {
                mapIntToNode[link.first],
                mapIntToNode[link.second],
                is_directed_graph,
                subgraphEdge[link.first][link.second]
            };
        }

        return {
            from,
            to,
            nodes,
            links
        };
    }
};

Matrix compute_distance_matrix(const std::string jsonPath) {
    GraphSimilarity sim(jsonPath);
    int n = sim.get_num_time();
    Matrix weighted_distance_matrix = sim.compute_distance_matrix();
    return weighted_distance_matrix;
}

SubgraphVector get_subgraph_set(const std::string jsonPath, const std::string mode, 
                                const std::string id, const int from, const int to) {
    GraphSimilarity sim(jsonPath);
    SubgraphVector result = sim.get_subgraph_set(mode, id, from, to);
    return result;
}

#ifndef DEBUG

PYBIND11_MODULE(graphComic, m) {
    m.doc() = "An optimized version of weighted jaccard distance"; // optional module docstring

    py::class_<SubgraphVector>(m, "SubgraphVector")
        .def_readwrite("_from", &SubgraphVector::from)
        .def_readwrite("_to", &SubgraphVector::to)
        .def_readwrite("nodes", &SubgraphVector::nodes)
        .def_readwrite("links", &SubgraphVector::links);

    py::class_<Edge>(m, "Edge")
        .def_readwrite("source", &Edge::source)
        .def_readwrite("target", &Edge::target)
        .def_readwrite("is_directed", &Edge::is_directed)
        .def_readwrite("value", &Edge::value);

    py::class_<GraphSimilarity>(m, "GraphSimilarity")
        .def(py::init<std::string>())
        .def("compute_distance_matrix", &GraphSimilarity::compute_distance_matrix)
        .def("get_subgraph_set", &GraphSimilarity::get_subgraph_set);

    m.def("compute_distance_matrix", &compute_distance_matrix, "Returns the distance matrix");
    m.def("get_subgraph_set", &get_subgraph_set, "Returns the combine graph over a time range");
}

#endif

#ifdef DEBUG

int main(int argc, char *argv[]) {
    using namespace std;
    SubgraphVector result = get_subgraph_set(argv[1], argv[2], argv[3], stoi(argv[4]), stoi(argv[5]));
    return 0;
}

#endif

/**
 * =======================================================================================================================
 * Install pybind11:
 * ```bash
 *  conda install -c conda-forge pybind11
 * ```
 * =======================================================================================================================
 * Use the following command to compile:
 * ```bash
 *  g++ -O2 -shared -std=c++11 -fPIC $(python3 -m pybind11 --includes) lib.cpp -o lib$(python3-config --extension-suffix)
 * ```
 * =======================================================================================================================
*/