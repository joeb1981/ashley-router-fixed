
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
    const { message } = req.body;

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantIDs.ashley,
    });

    let runStatus;
    do {
      await new Promise((res) => setTimeout(res, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(thread.id);
    const ashleyMessage = messages.data[0].content[0].text.value;

    let routedAssistant = null;
    if (/video|script|reels|tiktok/i.test(ashleyMessage)) routedAssistant = assistantIDs["Viral S.F. Video Scripts"];
    if (/food|calories|meal|macros|nutrition/i.test(ashleyMessage)) routedAssistant = assistantIDs["Your Personal Meal Planner"];

    let finalReply = ashleyMessage;

    if (routedAssistant) {
      const routedThread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(routedThread.id, {
        role: "user",
        content: message,
      });
      const routedRun = await openai.beta.threads.runs.create(routedThread.id, {
        assistant_id: routedAssistant,
      });

      let routedStatus;
      do {
        await new Promise((res) => setTimeout(res, 1500));
        routedStatus = await openai.beta.threads.runs.retrieve(routedThread.id, routedRun.id);
      } while (routedStatus.status !== "completed");

      const routedMessages = await openai.beta.threads.messages.list(routedThread.id);
      const routedReply = routedMessages.data[0].content[0].text.value;

      finalReply = `${ashleyMessage}

➡️ ${routedReply}`;
    }

    res.status(200).json({ response: finalReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
