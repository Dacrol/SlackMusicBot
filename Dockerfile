# FROM jrottenberg/ffmpeg:4.1-ubuntu
FROM node:10.16-stretch
# COPY --from=0 / /

RUN apt-get update -y
# RUN apt-get install libasound2-dev ffmpeg -y
RUN apt-get install -y ffmpeg libasound2-dev libasound2 alsa-utils alsa-oss mkchromecast vim mkchromecast-pulseaudio

# RUN bash -c 'echo "set-default-sink Mkchromecast" >> /etc/pulse/default.pa'

RUN chmod -R 777 /home/node
RUN usermod -a -G audio node
USER node
