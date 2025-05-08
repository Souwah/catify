export async function handler(event) {
  const CAT_API_KEY = process.env.CAT_API_KEY;
  const breedId = event.queryStringParameters.breed_id;

  if (!breedId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing breed_id' })
    };
  }

  try {
    const res = await fetch(`https://api.thecatapi.com/v1/images/search?breed_ids=${breedId}&limit=1`, {
      headers: { 'x-api-key': CAT_API_KEY }
    });

    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch image' })
    };
  }
}
