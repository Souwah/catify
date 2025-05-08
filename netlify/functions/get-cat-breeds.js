export async function handler() {
  const CAT_API_KEY = process.env.CAT_API_KEY;

  try {
    const res = await fetch('https://api.thecatapi.com/v1/breeds', {
      headers: {
        'x-api-key': CAT_API_KEY
      }
    });

    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch cat breeds' })
    };
  }
}
