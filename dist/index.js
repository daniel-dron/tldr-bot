"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = require("openai");
dotenv_1.default.config();
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error("Missing environment variables");
}
exports.config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
};
const data = new discord_js_1.SlashCommandBuilder()
    .setName('tldr')
    .setDescription('Summarize a waffling session');
function execute(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        return interaction.reply("working on it");
    });
}
const discord_js_2 = require("discord.js");
const client = new discord_js_2.Client({
    partials: [discord_js_1.Partials.Message, discord_js_1.Partials.Channel, discord_js_1.Partials.Reaction],
    intents: [discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent, discord_js_1.GatewayIntentBits.Guilds]
});
client.once('ready', () => {
    var _a;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
});
const openai = new openai_1.OpenAI();
client.on(discord_js_1.Events.MessageCreate, (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (message.content.split(" ")[0] === "!tldr") {
        const n = +message.content.split(" ")[1];
        let final_message = "";
        if (n > 100) {
            // fetch 100 messages at a time
            for (let i = 0; i < n; i += 100) {
                yield message.channel.messages.fetch({ limit: Math.min(n - i, 100) }).then(messages => {
                    final_message += messages.reverse().map(m => "<" + m.author.username + ">: \n" + m.content).join("\n");
                });
            }
        }
        else {
            yield message.channel.messages.fetch({ limit: n }).then(messages => {
                // remove the command message
                messages.delete(message.id);
                final_message = messages.reverse().map(m => "<" + m.author.username + ">: \n" + m.content).join("\n");
            });
        }
        console.log(final_message);
        const response = yield openai.chat.completions.create({
            messages: [
                { role: "system", content: "I need a summary of these discord conversation. The conversation is structured as follows: the structure of the conversation is identified like '<username>: <message>.'" },
                { role: "user", content: final_message }
            ],
            model: 'gpt-3.5-turbo'
        });
        message.reply(((_a = response.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.split("\n")[0]) || "I'm sorry, I couldn't summarize that conversation");
    }
}));
client.login(exports.config.DISCORD_TOKEN);
