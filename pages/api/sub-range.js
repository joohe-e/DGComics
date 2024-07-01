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
  const { data_name, from, to, id, mode } = query;

  switch (method) {
    case 'GET':
      let filter = '';
      if(from) {
        filter = `_from=${from}`;
      }
      if(to) {
        filter = filter + `&_to=${to}`;
      }
      if(id) {
        filter = filter + `&id=${id}`;
      }
      if(mode) {
        filter = filter + `&mode=${mode}`;
      }
      
      const url = `http://${SERVER_ENDPOINT}/sub-range/${data_name}?${filter}`;
      const response = await fetch(url);
      const graph = await response.json();
      res.status(200).json(graph)
      break
    default:
      res.setHeader('Allow', ['GET']) 
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
