require('dotenv').config()
const { RTMClient } = require('@slack/rtm-api')
const Player = require('../player/player')
const player = new Player()

const token = process.env.SLACK_BOT_TOKEN

const rtm = new RTMClient(token)

const urlRegex = /<(.+)>/

rtm.on('message', async event => {
  if (event.subtype || !event.channel.startsWith('C')) {
    return
  }
  console.log(event)
  const reply = await rtm.sendMessage(`Ayyy, <@${event.user}>`, event.channel)
  const url = urlRegex.exec(event.text)
  console.log(url)
  if (!Array.isArray(url) || typeof url[1] !== 'string') {
    return
  }
  try {
    await player.play(url[1])
  } catch (error) {
    console.warn(error)
  }
})
;(async () => {
  // Connect to Slack
  const { self, team } = await rtm.start()
  console.log('Connected!')
  setTimeout(() => {
    console.log(self, team)
  }, 5000)
})()
