import json
import os
from typing import Union, Tuple
import time
import numpy as np
from .graphComic import GraphSimilarity

class Cache:
    def __init__(self) -> None:
        self.graph = {}
        self.hierarchy_overview = {}
        self.table = {}
        self.dissim = {}
        self.nodewise_dissim = {}
        self.sankey = {}
        self.comm_lists = {}
        self.partition_lists = {}
        self.year_lists = {}
        self.labels = {}
        self.main_character_data = {}
        self.distance_matrix = {}
        self.high_performance_graph = {}
    
    def check_data(self, type: str, name: str) -> bool:
        return name in getattr(self, type)

    def check_data_by_name_and_key(self, type: str, name: str, key: str) -> bool:
        if not self.check_data(type, name):
            return False
        return key in getattr(self, type)[name]
    
    def set_data(self, type: str, data: dict) -> None:
        setattr(self, type, data)

    def get_data(self, type: str) -> dict:
        return getattr(self, type)

    def get_data_by_name(self, type: str, name: str) -> dict:
        if not self.check_data(type, name):
            return {}
        return getattr(self, type)[name]
    
    def get_data_by_name_and_key(self, type: str, name: str, key: str) -> dict:
        if not self.check_data(type, name):
            return {}
        if key not in getattr(self, type)[name]:
            return {}
        return getattr(self, type)[name][key]
    
    def update_data(self, type: str, name: str, data: dict) -> None:
        if not self.check_data(type, name):
            setattr(self, type, {**getattr(self, type), name: {}})
        getattr(self, type)[name] = data

    def update_data_by_name(self, type: str, name: str, key: str, data: dict) -> None:
        if not self.check_data(type, name):
            setattr(self, type, {**getattr(self, type), name: {}})
        getattr(self, type)[name][key] = data



class DataManager:

    def __init__(self) -> None:
        self._cache = Cache()

    def _load_data(self, type: str, name: str, mode: Union[None, str]=None) -> dict:
        if not self._cache.check_data(type, name):
            path = os.path.join(os.path.dirname(__file__), name, f"{type}.json")
            if mode is not None:
                path = os.path.join(os.path.dirname(__file__), name, mode, f"{type}.json")
            with open(path, encoding='UTF8') as f:
                if mode is not None:
                    self._cache.update_data_by_name(type, name, mode, json.load(f))
                else:
                    self._cache.update_data(type, name, json.load(f))
                    
        if mode is not None:
            if not self._cache.check_data_by_name_and_key(type, name, mode):
                path = os.path.join(os.path.dirname(__file__), name, mode, f"{type}.json")
                with open(path, encoding='UTF8') as f:
                    self._cache.update_data_by_name(type, name, mode, json.load(f))
            return self._cache.get_data_by_name_and_key(type, name, mode)

        return self._cache.get_data_by_name(type, name)

    def load_graph_data(self, name: str) -> dict:
        return self._load_data("graph", name)
    
    def load_year_distance_matrix_data(self, name: str) -> dict:
        return self._load_data("distance_matrix", name)
    
    def load_hierarchy_overview_data(self, name: str) -> dict:
        return self._load_data("hierarchy_overview", name)
    
    def load_table_data(self, name: str) -> dict:
        return self._load_data("table", name)

    def load_dissim_data(self, name: str, mode: str) -> dict:
        return self._load_data("dissim", name, mode)
    
    def load_nodewise_dissim_data(self, name: str) -> dict:
        return self._load_data("nodewise_dissim", name)
    
    def load_sankey_data(self, name: str) -> dict:
        return self._load_data("sankey", name)
    
    def load_comm_lists_data(self, name: str) -> dict:
        return self._load_data("comm_lists", name)
    
    def load_partition_lists_data(self, name: str) -> dict:
        return self._load_data("partition_lists", name)
    
    def load_year_lists_data(self, name: str, mode: str) -> dict:
        return self._load_data("year_lists", name, mode)
    
    def load_main_character_hierarchy_data(self, name: str, mode: str) -> Tuple[dict, dict]:
        graph_data = self.load_graph_data(name)

        if self._cache.check_data_by_name_and_key("main_character_data", name, mode) and self._cache.check_data_by_name_and_key("labels", name, mode):
            return self._cache.get_data_by_name_and_key("main_character_data", name, mode), self._cache.get_data_by_name_and_key("labels", name, mode)

        if mode is not None:
            year_list = self.load_year_lists_data(name, mode) 
            distance_matrices = {}
            labels = {}
            min_year = min(year_list, key=lambda x: x["from"])["from"]
            max_year = max(year_list, key=lambda x: x["to"])["to"]
            num_years = max_year - min_year + 1
            for year in year_list:
                distances = year["distance"]
                i, j = year["from"], year["to"]
                i -= min_year
                j -= min_year
                for key, value in distances.items():
                    if key not in distance_matrices:
                        distance_matrices[key] = np.full((num_years, num_years), 0)
                    distance_matrices[key][i, j] = value
                    distance_matrices[key][j, i] = value

            delete_times = {}
            for i in range(num_years):
                nodes = set(map(lambda x: x["label"], graph_data[i]["nodes"]))
                for key, value in distance_matrices.items():
                    if key not in nodes:
                        if key not in delete_times:
                            delete_times[key] = []
                        delete_times[key].append(i)
                    else:
                        if key not in labels:
                            labels[key] = []
                        labels[key].append(min_year + i)

            for key, value in distance_matrices.items():
                if key not in delete_times:
                    continue
                distance_matrices[key] = np.delete(distance_matrices[key], delete_times[key], 0)
                distance_matrices[key] = np.delete(distance_matrices[key], delete_times[key], 1)

            for key, value in distance_matrices.items():
                if (value.max() == value.min()):
                    continue
                distance_matrices[key] = (value - value.min()) / (value.max() - value.min())


            self._cache.update_data_by_name("main_character_data", name, mode, distance_matrices)
            self._cache.update_data_by_name("labels", name, mode, labels)

        return self._cache.get_data_by_name_and_key("main_character_data", name, mode), self._cache.get_data_by_name_and_key("labels", name, mode)

    def load_distance_matrix_by_time(self, name: str, _from: int, _to: int) -> dict:
        distance_matrix = self.load_year_distance_matrix_data(name)
        distance_matrix = np.array(distance_matrix)
        return distance_matrix[_from:_to + 1, _from:_to + 1]

    def load_high_performance_graph(self, name: str) -> GraphSimilarity:
        if self._cache.check_data("high_performance_graph", name):
            return self._cache.get_data_by_name("high_performance_graph", name)
        
        path = os.path.join(os.path.dirname(__file__), name, f"graph.json")
        graphSim = GraphSimilarity(path)
        self._cache.update_data("high_performance_graph", name, graphSim)
        return graphSim
