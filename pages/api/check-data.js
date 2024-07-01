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
  const { data_name } = query;

  switch (method) {
    case 'GET':
      const url = `http://${SERVER_ENDPOINT}/all-data`;
      const response = await fetch(url);
      const all_data = await response.json();
      const is_exist = Array.from(all_data).includes(data_name)
      res.status(200).json({is_exist});
      break
    default:
      res.setHeader('Allow', ['GET']) 
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
