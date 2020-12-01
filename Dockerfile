# FROM jrottenberg/ffmpeg:4.1-ubuntu
FROM node:10.16-stretch

RUN apt-get update -y
RUN apt-get install -y ffmpeg libasound2-dev libasound2 alsa-utils alsa-oss mkchromecast vim mkchromecast-pulseaudio pulseaudio

COPY . /home/node/app
WORKDIR /home/node/app
RUN npm i && npm rebuild

RUN usermod -a -G audio node
USER node
CMD ["npm", "run", "dev"]
