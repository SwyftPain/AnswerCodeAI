require("dotenv").config();
const fs = require("fs");
const brain = require("brain.js");
const {
  Client,
  Partials,
  GatewayIntentBits,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const client = new Client({
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
});

let trainingData = JSON.parse(fs.readFileSync("trainingData.json", "utf-8"));

const net = new brain.recurrent.LSTM();
net.train(trainingData, {
  iterations: 100,
  errorThreshold: 0.011,
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("with my brain", { type: ActivityType.Playing });
});

client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!p")) return;

  const buttonCollector = (message) => {
    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "correct") {
        trainingData.push({ input, output });
        interaction.reply({
          content: "Thank you for your feedback",
          ephemeral: true,
        });
        button.setDisabled(true);
        button2.setDisabled(true);
        message.edit({ components: [row] });
        collector.stop();
      } else if (interaction.customId === "incorrect") {
        interaction.reply({
          content: "Please type your correction",
          ephemeral: true,
        });
        const filter = (m) => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter });
        collector.on("collect", async (m) => {
          trainingData.push({ input, output: m.content });
          fs.writeFileSync("trainingData.json", JSON.stringify(trainingData));
          m.reply({ content: "Thank you for your feedback", ephemeral: true });
          button.setDisabled(true);
          button2.setDisabled(true);
          message.edit({ components: [row] });
          collector.stop();
        });
      }
    });

    collector.on("end", (collected) => {
      console.log(`Collected ${collected.size} interactions.`);
      collector.stop();
    });
  };

  const input = msg.content.slice(2).toLowerCase();
  let output = net.run(input);
  const row = new ActionRowBuilder();
  const button = new ButtonBuilder();
  button.setLabel("Correct");
  button.setStyle("Success");
  button.setCustomId("correct");
  button.setEmoji("✅");
  const button2 = new ButtonBuilder();
  button2.setLabel("Incorrect");
  button2.setStyle("Secondary");
  button2.setCustomId("incorrect");
  button2.setEmoji("❌");
  row.addComponents(button, button2);
  if (output.length > 0) {
    await msg
      .reply({ content: output, components: [row] })
      .then((message) => {
        buttonCollector(message);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    await msg
      .reply({ content: "I don't know what to say", components: [row] })
      .then((message) => {
        buttonCollector(message).catch((err) => {
          console.log(err);
        });
      });
  }
});

client.login(process.env.BOT_TOKEN);
