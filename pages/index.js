import { useEffect, useState } from 'react';
import styles from '../styles/Index.module.css';

const example_filter = {
  "nation-trade": "?from=1930&to=1960"
}

function DatasetList({ dataList }) {
  if(dataList === null) {
    return (<h2 className={styles.tutorial}>Finding datasets...</h2>);
  }

  if(dataList.length === 0) {
    return (<h2 className={styles.tutorial}>Unfortunately, there is no dataset currently available</h2>);
  }

  return <div className={styles.dataset}>
    <h2>Current supported datasets:</h2>
    <p>Click the link to access the dataset</p>
    <table className={styles.table}>
      <tr className={`${styles.table} tr`}>
        <th className={`${styles.table} th`}>Dataset</th>
        <th className={`${styles.table} th`}>Time range</th>
        <th className={`${styles.table} th`}>Link</th>
      </tr>
      {dataList.map((data, i) => {
        const from = data.from;
        const to = data.to;
        const data_name = data.data_name;
        const filter = example_filter[data_name];
        const url = `https://haiv.unist.ac.kr:2019/data/${data_name}${(filter)? filter : ""}`;
        return <tr key={i}>
          <td className={`${styles.table} th`}>{data_name}</td>
          <td className={`${styles.table} th`}>{`${from} - ${to}`}</td>
          <td className={`${styles.table} th`}><a href={url}>{url}</a></td>
        </tr>
      })}
    </table>
  </div>;
}

export default function Home() {
  const [dataList, setDataList] = useState(null);

  useEffect(() => {
    fetch("/api/all-data").then((res) => res.json()).then(async (data) => {
      const list_data = []
      for(const data_name of data) {
        const data_range = await fetch(`/api/data-range?data_name=${data_name}`)
        const range = await data_range.json();
        list_data.push({
          data_name: data_name,
          from: range.from,
          to: range.to
        });
      }
      setDataList(list_data);
    });
  }, []);

  return <>
    <h1 style={{textAlign: "center"}}>Welcome to DGComic!</h1>

    <div className={styles.tutorial}>
      <h2>How to use?</h2>
      <p>Go to https://haiv.unist.ac.kr:2019/data/[data_name]</p>
    </div>

    <DatasetList dataList={dataList} />

  </>
}

