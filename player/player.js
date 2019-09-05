const decoder = require('lame').Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg');

// @ts-ignore
const speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
})

let url = 'https://www.youtube.com/watch?v=vv2DSmy3Tro'

const stream = ytdl(url, {
  highWaterMark: 2 ** 25,
  quality: 'highestaudio',
  filter: 'audioonly'
})

const audio = ffmpeg(stream).format('mp3')
// @ts-ignore
audio.pipe(decoder()).pipe(speaker)
