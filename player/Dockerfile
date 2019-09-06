# FROM jrottenberg/ffmpeg:4.1-ubuntu
FROM node:10.16-stretch
# COPY --from=0 / /

RUN apt-get update -y
RUN apt-get install libasound2-dev libav-tools -y

RUN chmod -R 777 /home/node
RUN usermod -a -G audio node
USER node
