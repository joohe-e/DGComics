from scipy.cluster import hierarchy
from functools import reduce
import numpy as np

class Cluster:
    def __init__(self, id, points, closest):
        self.id = id
        self.points = points
        self.closest = closest
    
    def __len__(self):
        return len(self.points)
    

def clustering_with_preserved_order(similarity, alpha = 1.0, beta = 0.0, verbose = False):
    n = similarity.shape[0]
    cnt = n
    hierarchical_clustering = []
    # Initially, each data point is a cluster itself
    clusters = [Cluster(i, [i], -np.inf) for i in range(n)]
    # Main loop
    while len(hierarchical_clustering) < n - 1:
        m = len(clusters)
        closest_distance = float("inf")
        candidates_id = [-1, -1]
        # Print the cluster
        if verbose:
            for i in range(m):
                print(clusters[i].points, end=' ')
            print()
        # Loop through each current clusters
        for i in range(m - 1):
            # Compute the average distance with added time step
            average = 0
            for x in clusters[i].points:
                for y in clusters[i + 1].points:
                    average += alpha * (1 - similarity[x, y]) + beta * (np.abs(x - y) / n)
            average /= len(clusters[i].points) * len(clusters[i + 1].points)
            # Update the minimum distance
            if average <= closest_distance:
                closest_distance = average
                candidates_id = [i, i + 1]
        # Print the minimum distance
        if verbose:
            print(closest_distance)
        # Log the process of clustering (cluster ID 1, cluster ID 2, their distance, the number of data point in the new cluster)
        thresholds = max(clusters[candidates_id[0]].closest, clusters[candidates_id[1]].closest, closest_distance)
        hierarchical_clustering.append([clusters[candidates_id[0]].id, clusters[candidates_id[1]].id, thresholds + 0.01, len(clusters[candidates_id[0]]) + len(clusters[candidates_id[1]])])
        # Merge the two clusters
        clusters[candidates_id[0]] = Cluster(cnt, [*clusters[candidates_id[0]].points, *clusters[candidates_id[1]].points], thresholds + 0.01)
        cnt += 1
        # Delete the other cluster
        del clusters[candidates_id[1]]
    hierarchical_clustering = np.array(hierarchical_clustering)
    return hierarchical_clustering


def linkage_to_json(linkage, labels, _from=None, _to=None):
    root = hierarchy.to_tree(linkage)

    def dfs(node):
        children = []
        name = []
        left_node = node.get_left()
        right_node = node.get_right()
        if node.is_leaf():
            return {
                "children": [],
                "name": str(labels[node.get_id()]),
                "time": labels[node.get_id()],
                "distance": node.dist,
            }
        if left_node is not None:
            children.append(dfs(left_node))
            name.append(children[-1]["name"])
        if right_node is not None:
            children.append(dfs(right_node))
            name.append(children[-1]["name"])
        return {
            "children": children,
            "name": "-".join(name),
            "time": reduce(lambda prev, curr: prev + curr["time"], children, 0) / len(children),
            "distance": node.dist
        }
    
    return dfs(root)