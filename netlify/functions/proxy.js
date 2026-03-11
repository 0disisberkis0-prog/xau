
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty request body' }) };
    }

    const body = JSON.parse(event.body);
    const apiKey = process.env.GROQ_KEY;

    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    // Groq API - OpenAI uyumlu format
    const messages = [];
    if (body.system) {
      messages.push({ role: 'system', content: body.system });
    }
    messages.push(...body.messages);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: body.max_tokens || 800,
        messages: messages
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e) { return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid API response' }) }; }

    if (data.error) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: JSON.stringify(data.error) }) };
    }

    // Groq yanıtını Anthropic formatına çevir
    const converted = {
      content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }]
    };

    return { statusCode: 200, headers, body: JSON.stringify(converted) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
