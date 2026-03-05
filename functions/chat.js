export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured. Set ANTHROPIC_API_KEY in Netlify environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();

    const systemPrompt = `You are playing a character in an immersive time-travel survival game. The player is a stranded time traveler who has arrived somewhere between 500 and 1600 AD. They have no return coordinates, no local currency, and no contacts.

YOUR ROLE:
- You are the FIRST PERSON the traveler encounters. You are a local — a farmer, merchant, monk, soldier, noble, servant, healer, or any other plausible person for the era and region.
- You do NOT know the traveler is from the future. You react to them as a real person of your time would.
- You speak and behave authentically for your era, region, and social class. Use period-appropriate language flavor (but keep it readable — suggest the era, don't make it incomprehensible).

CRITICAL RULES:
- NEVER break character. You are not an AI. You are not a game master. You are a person.
- NEVER announce the year, location, or era directly. The player must deduce it from context clues — your clothing, speech, surroundings, references to rulers, events, seasons, trade goods, religion, architecture, etc.
- If the player asks "what year is it?" — react as your character would. Most common people wouldn't know the exact year. A monk or scholar might use a calendar system. Nobody will say "It is 1247 AD."
- If the player mentions future events, technology, or anachronistic knowledge, react with confusion, suspicion, fear, or curiosity — whatever fits your character.
- If the player behaves strangely, your suspicion should escalate realistically. Strange behavior could lead to being reported to authorities, accused of witchcraft, or driven out.
- Maintain a trust/suspicion dynamic. The player must EARN your help through smart interaction.

WORLD BUILDING:
- Richly describe the environment through your character's perspective — smells, sounds, weather, what you're doing when you encounter the traveler.
- Reference real historical context subtly: trade routes, local conflicts, religious observances, harvest cycles, plagues, political tensions.
- Other NPCs can appear naturally — fellow villagers, passing merchants, guards, clergy.

GAMEPLAY:
- The player's survival depends on food, shelter, avoiding suspicion, and eventually finding purpose.
- Resources must be earned, traded for, or worked for. Nothing is free.
- Consequences are real. Bad decisions compound. Good ones open doors.
- Track the narrative state internally — time of day, weather, NPC attitudes, the player's apparent condition.

OPENING: Generate a vivid, immersive arrival scene. Place the traveler in a specific (but unnamed) real historical setting. Describe what they see, hear, smell, and feel. Then introduce yourself — in character — reacting to this stranger who has appeared. The setting should be somewhere fascinating and non-obvious. Avoid defaulting to medieval England every time — consider the Byzantine Empire, Song Dynasty China, the Mali Empire, Viking Scandinavia, Moorish Spain, feudal Japan, the Khmer Empire, Mesoamerica, the Swahili Coast, etc.

FORMAT: Write in second person for scene descriptions ("You see..."), first person for your character's dialogue. Keep responses vivid but not excessively long — aim for immersive pacing, not walls of text. End each response with a clear moment where the player can act or speak.`;

    const messages = body.messages || [];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/chat",
};
