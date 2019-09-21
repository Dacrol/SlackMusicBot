const lame = require('lame')
const Decoder = lame.Decoder
const Speaker = require('speaker')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const Volume = require('pcm-volume')
const { getInfo } = require('ytdl-getinfo')
const axios = require('axios').default
const Stopwatch = require('@dacrol/stopwatch')
const VideoServer = require('./video-server')

class Player {
  constructor() {
    this.queued = []
    this.isPlaying = false
    this.currentVolume = 1
    this.volumeTransform = null
    this.currentlyPlaying = null
    this.currentAudio = null
    this.currentStream = null
    this.autoplay = false
    this.events = {}
    this.history = []
    this.stopwatch = new Stopwatch()
    this.trackWasSkipped = false
    const {server, relay} = VideoServer()
    this.server = server
    this.relay = relay
  }

  set volume(vol) {
    if (vol > 100) {
      vol = 100
    }
    vol = vol / 100
    this.currentVolume = vol
    if (this.volumeTransform) {
      this.volumeTransform.setVolume(vol)
    }
  }

  play(next) {
    return new Promise(async (resolve, reject) => {
      const url = next.url
      if (!Player.isYoutube(url)) {
        reject(new Error('Not a valid YouTube ID/URL'))
        return
      }
      let info = {}
      try {
        let streamError = null
        const stream = ytdl(url, {
          highWaterMark: 2 ** 25,
          quality: 'highestaudio',
          filter: 'audioonly'
        })

        stream.on('info', (_info, format) => {
          info = _info
          this.fire('play', [next.event, info.title])

          this.currentStream = stream

          const audio = ffmpeg(stream)
            .format('mp3')
            // @ts-ignore
            .outputOptions(this.ffmpegOutputOptions || [])

          this.currentAudio = audio
          // @ts-ignore
          const speaker = new Speaker({
            channels: 2,
            bitDepth: 16,
            sampleRate: 48000
          })

          audio.on('error', error => {
            streamError = error
            console.log(`Audio played for ${~~(this.stopwatch.stop() / 1000)} seconds`)
            speaker.close(true)
            reject({ error: error, url: url, info: info, queueItem: next })
          })

          this.volumeTransform = new Volume(this.currentVolume)

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
            .pipe(this.volumeTransform)
            .pipe(speaker)
          this.currentlyPlaying = playing
          playing.on('open', () => {
            this.stopwatch.start()
          })
          playing.on('close', () => {
            if (streamError) return
            // @ts-ignore
            console.log(`Audio played successfully for ${~~(this.stopwatch.stop() / 1000)} seconds`)
            resolve({ url: url, info: info, queueItem: next })
          })
        })
      } catch (error) {
        reject({ error: error, url: url, info: info, queueItem: next })
      }
    })
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  fire(event, args) {
    if (!Array.isArray(this.events[event])) {
      return
    }
    this.events[event].forEach(eventFunction => {
      eventFunction.apply(this, args)
    })
  }

  queue(url, event) {
    if (!Player.isYoutube(url)) {
      throw new Error('Not a valid YouTube ID/URL')
    }
    this.queued.push({ url: url, event: event })
    if (!this.isPlaying) {
      this.playQueue().catch(error => {
        console.error(error)
      })
    }
  }

  skip() {
    this.trackWasSkipped = true
    this.currentAudio.kill('SIGTERM')
    this.currentlyPlaying.destroy()
    this.currentStream.destroy()
  }

  playNext() {
    const next = this.queued.shift()
    return this.play(next).finally(() => {
      this.addToHistory(next)
    })
  }

  addToHistory(track) {
    this.history.push(track)
  }

  async getAutoplayTrack(info) {
    try {
      if (!(info && info.player_response && info.player_response.endscreen)) {
        throw new Error('No info.player_response.endscreen')
      }
      const endscreenUrl =
        'https:' + info.player_response.endscreen.endscreenUrlRenderer.url
      let { data: endscreenInfo } = await axios.get(endscreenUrl)
      if (endscreenInfo.startsWith(')]}')) {
        endscreenInfo = endscreenInfo.replace(/^\)\]\}/, '')
        endscreenInfo = JSON.parse(endscreenInfo)
      }
      const nextVideo = endscreenInfo.elements.find(element => {
        if (element.endscreenElementRenderer.style.toLowerCase() === 'video') {
          return true
        }
      })
      let nextID = nextVideo.endscreenElementRenderer.endpoint.urlEndpoint.url
      if (nextID.startsWith('/watch?v=')) {
        nextID = nextID.replace('/watch?v=', '')
      }
      return {
        id: nextID,
        title: nextVideo.endscreenElementRenderer.title.simpleText
      }
    } catch (error) {
      console.error('Error while looking up next video to autoplay', error)
      throw error
    }
  }

  async playQueue() {
    while (this.queued.length > 0) {
      this.isPlaying = true
      const playedTrack = await this.playNext().catch(error => {
        if (!this.trackWasSkipped) {
          console.error(
            'Error while playing next, or track was skipped',
            error.error
          )
        } else {
          console.log('Track skipped')
          this.trackWasSkipped = false
        }
        return error
      })
      if (this.queued.length === 0 && this.autoplay) {
        try {
          let info = playedTrack.info
          if (
            !(info && info.player_response && info.player_response.endscreen)
          ) {
            try {
              info = await ytdl.getInfo(playedTrack.url)
            } catch (error) {
              console.error(error)
            }
          }
          const nextTrack = await this.getAutoplayTrack(info).catch(error => {
            return {
              id: info.related_videos[0].id,
              title: info.related_videos[0].title
            }
          })
          this.queue(nextTrack.id, playedTrack.queueItem.event)
          console.log('Queued: ' + nextTrack.title)
        } catch (error) {
          console.warn('Video had no next video to autoplay', error)
        }
      }
    }
    this.isPlaying = false
  }

  stop() {
    this.queued = []
    this.autoplay = false
    if (this.isPlaying) {
      this.skip()
    }
  }

  toggleAutoplay(value) {
    if (!value) {
      this.autoplay = !this.autoplay
    } else if (['1', 'on', 'enable', 'enabled'].some(str => value === str)) {
      this.autoplay = true
    } else if (['0', 'off', 'disable', 'disabled'].some(str => value === str)) {
      this.autoplay = false
    }
    return this.autoplay
  }

  static isYoutube(string) {
    return ytdl.validateURL(string) || ytdl.validateID(string)
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
