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
      if (!Player.isYoutubeUrl(url)) {
        reject(new Error('Not a valid YouTube ID/URL'))
        return
      }
      try {
        const stream = ytdl(url, {
          highWaterMark: 2 ** 25,
          quality: 'highestaudio',
          filter: 'audioonly'
        })

        const audio = ffmpeg(stream).format('mp3')
        let time
        // @ts-ignore
        const speaker = new Speaker({
          channels: 2,
          bitDepth: 16,
          sampleRate: 48000
        })

        const playing = audio
          .pipe(
            // @ts-ignore
            new Decoder({
              channels: 2,
              bitDepth: 16,
              sampleRate: 48000,
              mode: lame.STEREO
            })
          )
          .pipe(volume)
          .pipe(speaker)
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
    if (!Player.isYoutubeUrl(url)) {
      throw new Error('Not a valid YouTube ID/URL')
    }
    this.playQueue.push(url)
    if (this.playQueue.length === 1) {
      this.playNext()
    }
  }

  playNext() {
    this.play(this.playQueue.pop())
  }

  static isYoutubeUrl(url) {
    return ytdl.validateURL(url)
  }
}

module.exports = Player
if (process.argv[2]) {
  const player = new Player()
  player.play(process.argv[2]).then(() => {
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  })
}
