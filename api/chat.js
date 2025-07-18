
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantIDs = {
  ashley: "asst_k3dHtKqcdXhc07VgEVpJwkfd",
  "Viral S.F. Video Scripts": "asst_5KL56DaiFpm2GT6Ayp6vqLy5",
  "Your Personal Meal Planner": "asst_YNInGDhCWN2F4KZvl29VgApI"
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    let target = "ashley";

    if (/script|video|tiktok|reel|viral/i.test(message)) {
      target = "Viral S.F. Video Scripts";
    } else if (/meal|diet|nutrition|calori|food|fat loss|lose weight/i.test(message)) {
      target = "Your Personal Meal Planner";
    }

    const thread = threadId
      ? await openai.beta.threads.retrieve(threadId)
      : await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantIDs[target],
    });

    let result;
    while (true) {
      result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (result.status === "completed") break;
      if (["failed", "cancelled", "expired"].includes(result.status)) {
        throw new Error("Run failed or expired");
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data.find(msg => msg.role === "assistant");

    res.json({
      reply: reply?.content?.[0]?.text?.value || "(No response)",
      sender: target,
      threadId: thread.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
