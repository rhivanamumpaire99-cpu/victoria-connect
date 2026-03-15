// netlify/functions/create-room.js
const DAILY_API_KEY = process.env.DAILY_API_KEY;

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { roomName, privacy = 'public', properties = {} } = JSON.parse(event.body);

    // Build room properties with defaults
    const roomProperties = {
      enable_chat: true,
      enable_screenshare: true,
      start_video_off: properties.start_video_off || false,
      start_audio_off: properties.start_audio_off || false,
      enable_knocking: properties.enable_knocking || false,
      max_participants: properties.max_participants || 100,
      ...properties
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName,
        privacy: privacy,
        properties: roomProperties
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};