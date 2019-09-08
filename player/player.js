const lame = require('lame')
const Decoder = lame.Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const Volume = require('pcm-volume')
const volume = new Volume()

class Player {
  constructor() {
    this.playQueue = []
  }

  set volume(vol) {
    if (vol > 100) {
      vol = 100
    }
    if (vol > 1) {
      vol = vol / 100
    }
    volume.setVolume(vol)
  }

  play(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = ytdl(url, {
          highWaterMark: 2 ** 25,
          quality: 'highestaudio',
          filter: 'audioonly'
        })

        const audio = ffmpeg(stream).format('mp3')
        let time;
        // @ts-ignore
        const speaker = new Speaker({
          channels: 2,
          bitDepth: 16,
          sampleRate: 48000
        })

        // @ts-ignore
        const playing = audio.pipe(new Decoder({
          channels: 2,
          bitDepth: 16,
          sampleRate: 48000,
          mode: lame.STEREO
        })).pipe(volume).pipe(speaker)
        playing.on('close', () => {
          console.log('Audio played successfully')
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  queue(url) {
    if (!isYoutubeUrl(url)) {
      return
    }
    this.playQueue.push(url)
    if (this.playQueue.length === 1) {
      this.playNext()
    }
  }

  playNext() {
    this.play(this.playQueue.pop())
  }
}

module.exports = Player
if (process.argv[2]) {
  const player= new Player()
  player.play(process.argv[2]).then(() => {
    setTimeout(() => {
      process.exit(0)
    }, 1000);
  })
}

function isYoutubeUrl(url) {
  if (
    (
      typeof url === 'string' &&
      ['https://www.youtube.com/', 'http://www.youtube.com/', 'youtube.com/', 'http://youtube.com/', 'https://youtube.com/'].some(validUrl => {
        return url.startsWith(validUrl)
      })
    )
  ) {
    return true
  }
  return false
}