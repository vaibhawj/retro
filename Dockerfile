FROM node:10-alpine

WORKDIR /retro
COPY . .

RUN npm i -g gulp && \
    npm i --ignore-scripts && \
    npm cache clean --force && \
    adduser --disabled-password --gecos "retro" --home /retro --no-create-home retro && \
    mkdir -p /retro/data && \
    chown -R retro:retro /retro

RUN npm rebuild --force

VOLUME /retro/data
USER retro

EXPOSE 4000 3030
CMD [ "npm", "run", "start" ]