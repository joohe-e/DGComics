// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { SERVER_ENDPOINT } from "../../constants";
import Cors from 'cors';
import fetch from "node-fetch";

const cors = Cors({
  methods: ['GET'],
  origin: '*',
});

function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
      fn(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result)
        }
  
        return resolve(result)
      })
    })
  }

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  
  const { query, body, method } = req
  const { data_name } = query;
  const { q, from, to, category } = body;

  const query_list = [];
  if(q === undefined) {
    // Do nothing
  }
  else if(typeof(q) === "string") {
    query_list.push(q);
  } else {
    query_list.push(...q);
  }

  let filter = '';
  if(from) {
    filter = `&_from=${from}`;
  }
  if(to) {
    filter = filter + `&_to=${to}`;
  }
  if(category) {
    filter = filter + `&category=${category}`;
  }


  switch (method) {
    case 'POST':
      const url = `http://${SERVER_ENDPOINT}/sankey/${data_name}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          q: query_list, 
          from_: parseInt(from),
          to_: parseInt(to),
          category: category,
        }),
      });
      const data = await response.json();
      res.status(200).json(data);
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
