import { useCallback, useMemo, useState } from "react";

function getNumRows(n) {
  return Math.ceil(Math.sqrt(n));
}

function getSplitArray(arr, minSum) {
  let sum = arr[0];
  let count = 1;
  const result = [[{
    id: 0,
    position: 0,
  }]];
  let pos = 1;

  for (let i = 1; i < arr.length; i++) {
    if (sum + arr[i] > minSum) {
      count++;
      sum = arr[i];
      pos = 0;
      result.push([{
          id: count - 1, 
          position: pos,
      }]);
    } else {
      sum += arr[i];
      result[count - 1].push({
        id: count - 1, 
        position: pos,
      });
    }
    pos++;
  }

  return result;
}

function isValidSplit(arr, k, minSum) {
  const splitArr = getSplitArray(arr, minSum);
  return splitArr.length <= k;
}

function splitMaxMinSubArray(arr, k) {
  let left = Math.min(...arr);
  let right = arr.reduce((a, b) => a + b, 0);

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (isValidSplit(arr, k, mid)) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return getSplitArray(arr, left);
}

export function generateLayout(num_nodes) {
  const k = getNumRows(num_nodes.length);
  const optimalSplit = splitMaxMinSubArray(num_nodes, k);
  const layout = {};
  layout.contents = optimalSplit.flat();
  layout.row_lengths = optimalSplit.map(row => row.length);
  return layout;
}

export function useArrayState(initial = []) {
  const array = useMemo(() => initial, []);
  const [refresh, setRefresh] = useState(0);
  const [significantChange] = useState(0);
  const cb = useCallback(async (f) => {
    if(typeof f !== 'function') {
      array.length = 0;
      array.push(...f);
    } else {
      await f(array);
    }
    setRefresh(it => ++it);
  }, []);

  return [array, cb, refresh];
}

export function useObjectState(initial = {}) {
  const object = useMemo(() => initial, []);
  const [refresh, setRefresh] = useState(0);
  const [significantChange] = useState(0);
  const cb = useCallback(async (f) => {
    if(typeof f !== 'function') {
      Object.assign(object, f);
    } else {
      await f(object);
    }
    setRefresh(it => ++it);
  }, []);

  return [object, cb, refresh];
}