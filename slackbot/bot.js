require('dotenv').config()
const { RTMClient } = require('@slack/rtm-api');

const token = process.env.SLACK_BOT_TOKEN;

const rtm = new RTMClient(token);

rtm.on('message', async (event) => {
  if (event.subtype || !(event.channel.startsWith('C'))) return
  console.log(event);
  const reply = await rtm.sendMessage(`Ayyy, <@${event.user}>`, event.channel)
});

(async () => {
  // Connect to Slack
  const { self, team } = await rtm.start();
  console.log('Connected!')
  setTimeout(() => {
    console.log(self, team)
  }, 10000);
})();