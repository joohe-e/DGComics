// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import Cors from 'cors';
import fetch from "node-fetch";
import { LLM_FEW_SHOTS, LLM_SYSTEM_PROMPT } from '../../constants';

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
  const { narrative } = body;

  const messages = [];

  messages.push(...LLM_SYSTEM_PROMPT);
  messages.push(...LLM_FEW_SHOTS);

  messages.push({ 'role': 'user', 'content': `Rewrite the following narration of a comic frame based on "${data_name}" so that it would be engaging and informative. Be concise. Your output must contain only the related information. You will be penalized if you start with "In the world of graph data" or similar sentences.
Here is my narration: "${narrative}"` });

  switch (method) {
    case 'POST':
      const url = process.env.LLM_API_URL;
      const model_name = process.env.LLM_MODEL_NAME;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: model_name,
          messages: messages,
        }),
      });
      
      if (!response.ok || !response.body) {
        throw response.statusText;
      }

      res = res.status(200);

      const stream = response.body;
      stream.on('readable', () => {
        let chunk;
        while (null !== (chunk = stream.read())) {
          res.write(chunk.toString());
        }
      });

      stream.on('end', () => {
        res.send();
      });

      // const data = await response.json();
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
