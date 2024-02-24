import { Client, Events, GatewayIntentBits, GuildTextBasedChannel, Message, Partials, TextBasedChannel } from "discord.js";
import { OpenAI } from "openai"
import dotenv from "dotenv";

dotenv.config();
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error("Missing environment variables");
}

const client = new Client({
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds]
});
const openai = new OpenAI();

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user?.tag}`);
});

const MESSAGES_PER_FETCH = 100;
const MAX_MESSAGES = 1000;
const MAX_TOKENS = 30000;

const BULLET_POINT = "Write a bullet point summary of the following discord conversation without loosing too much info. You must include in the summary what each user in the conversation contributed. The conversation is structured like '<username>: <message>.'";
const SUMMARY = "Write a summary of the following discord conversation without loosing too much info. You must include in the summary what each user in the conversation contributed. The conversation is structured like '<username>: <message>.'";

async function fetchMessages(channel: GuildTextBasedChannel | TextBasedChannel, messageId: string, n: number) {
    let last_id = messageId;
    let final_messages = new Array<Message>();

    for (let i = 0; i < n; i += MESSAGES_PER_FETCH) {
        await channel.messages.fetch({ after: last_id, limit: Math.min(n - i, MESSAGES_PER_FETCH) }).then(messages => {
            if (messages.size === 0) return;
            if (messages.first()?.id === last_id) return;

            last_id = messages.first()?.id as string;

            final_messages.push(...Array.from(messages.values()));
        });
    }

    return final_messages;
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.reference) return;

    try {
        let args = message.content.split(" ");
        if (args[0] === "!tldr") {
            const n: number = +args[1];
            if (n > MAX_MESSAGES) {
                message.reply("Max 1000 messages.");
                return;
            }

            let context = BULLET_POINT;
            if (args.length === 3) {
                switch (args[2]) {
                    case "bullet": context = BULLET_POINT; break;
                    case "summary": context = SUMMARY; break;
                    default: {
                        message.reply("!tldr <n> <bullet|summary>");
                        return;
                    };
                }
            }

            await fetchMessages(message.channel, message.reference.messageId as string, n).then(async messages => {
                const final_message = messages.map(m => {
                    if (m.author.bot) return;
                    return "<" + m.author.username + ">: \n" + m.content;
                }).join("\n");

                if (final_message.length > MAX_TOKENS) {
                    message.reply("Way too many words. Max 30000 tokens.");
                    return;
                }

                const response = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: final_message }
                    ],
                    model: 'gpt-3.5-turbo'
                });

                message.reply(response.choices[0].message.content || "Couldn't generate a summary.");
            });

        }
    } catch (error) {
        message.reply("Error.");
        console.log(error);
        return;
    }
});

client.login(DISCORD_TOKEN);
