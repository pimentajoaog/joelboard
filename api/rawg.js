import { proxyRawgRequest, rawgApiKey, rawgJsonResponse } from '../lib/rawg-proxy.mjs';

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  const result = await proxyRawgRequest(request.url, rawgApiKey(process.env));
  return rawgJsonResponse(result);
}
