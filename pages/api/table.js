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

export const config = {
  api: {
    responseLimit: false,
  },
}


export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const { query, method } = req
  const { data_name, skip1, all, _from, _to } = query;

  switch (method) {
    case 'GET':
      const url = `http://${SERVER_ENDPOINT}/table/${data_name}?skip1=${skip1}&all=${all}&_from=${_from}&_to=${_to}`;
      const response = await fetch(url);
      const data = await response.json();
      res.status(200).json(data);
      break
    default:
      res.setHeader('Allow', ['GET']) 
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
