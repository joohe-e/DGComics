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

  const { query, method } = req
  const { data_name, q, _from, _to, category } = query;

  let filter = '';
  if(category) {
      filter = filter + `&category=${category}`;
  }

  if(_from) {
    filter = filter + `&_from=${_from}`;
  }

  if(_to) {
    filter = filter + `&_to=${_to}`;
  }

  let query_list = "";
  if(q === undefined) {
    // Do nothing
  }
  else if(typeof(q) === "string") {
    query_list += `q=${q}&`;
  } else {
    for(const id of q) {
      query_list += `q=${id}&`;
    }
  }

  switch (method) {
    case 'GET':
      const url = `http://${SERVER_ENDPOINT}/community_change/${data_name}?${query_list}${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      res.status(200).json(data);
      break
    default:
      res.setHeader('Allow', ['GET']) 
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
