
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantIDs = {
  ashley: "asst_k3dHtKqcdXhc07VgEVpJwkfd",
  "Viral S.F. Video Scripts": "asst_5KL56DaiFpm2GT6Ayp6vqLy5",
  "Your Personal Meal Planner": "asst_YNInGDhCWN2F4KZvl29VgApI"
};

let scottThreadId = null;
let routedThreads = {};
let currentAssistant = "ashley";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { message } = req.body;

    // === Step 1: Create Scott thread if needed ===
    if (!scottThreadId) {
      const thread = await openai.beta.threads.create();
      scottThreadId = thread.id;
      currentAssistant = "ashley";
    }

    // === Step 2: Add message to current assistant's thread ===
    if (currentAssistant === "ashley") {
      await openai.beta.threads.messages.create(scottThreadId, {
        role: "user",
        content: message,
      });

      const run = await openai.beta.threads.runs.create(scottThreadId, {
        assistant_id: assistantIDs.ashley,
      });

      let runStatus;
      do {
        await new Promise((res) => setTimeout(res, 1500));
        runStatus = await openai.beta.threads.runs.retrieve(scottThreadId, run.id);
      } while (runStatus.status !== "completed");

      const messages = await openai.beta.threads.messages.list(scottThreadId);
      const ashleyMessage = messages.data[0].content[0].text.value;

      // ROUTING DECISION ONLY ON FIRST RUN
      let routedAssistant = null;
      if (/video|script|reels|tiktok/i.test(message)) {
        routedAssistant = "Viral S.F. Video Scripts";
      } else if (/food|calories|meal|macros|nutrition|fat loss/i.test(message)) {
        routedAssistant = "Your Personal Meal Planner";
      }

      if (routedAssistant) {
        currentAssistant = routedAssistant;

        if (!routedThreads[routedAssistant]) {
          const newThread = await openai.beta.threads.create();
          routedThreads[routedAssistant] = newThread.id;
        }

        await openai.beta.threads.messages.create(routedThreads[routedAssistant], {
          role: "user",
          content: message,
        });

        const routedRun = await openai.beta.threads.runs.create(routedThreads[routedAssistant], {
          assistant_id: assistantIDs[routedAssistant],
        });

        let routedStatus;
        do {
          await new Promise((res) => setTimeout(res, 1500));
          routedStatus = await openai.beta.threads.runs.retrieve(routedThreads[routedAssistant], routedRun.id);
        } while (routedStatus.status !== "completed");

        const routedMessages = await openai.beta.threads.messages.list(routedThreads[routedAssistant]);
        const routedReply = routedMessages.data[0].content[0].text.value;

        return res.status(200).json({
          response: `${ashleyMessage}

➡️ ${routedReply}`
        });
      }

      // No routing happened, just return Ashley's reply
      return res.status(200).json({ response: ashleyMessage });

    } else {
      // Already routed, just continue with existing specialist assistant
      const assistant = currentAssistant;
      const threadId = routedThreads[assistant];

      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantIDs[assistant],
      });

      let status;
      do {
        await new Promise((res) => setTimeout(res, 1500));
        status = await openai.beta.threads.runs.retrieve(threadId, run.id);
      } while (status.status !== "completed");

      const messages = await openai.beta.threads.messages.list(threadId);
      const reply = messages.data[0].content[0].text.value;

      return res.status(200).json({ response: reply });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
