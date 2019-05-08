FROM node:10-alpine

ADD https://github.com/waninlezu/distributed/archive/gh-pages.tar.gz /Downloads/gh-pages.tar.gz

RUN tar -xzf /Downloads/gh-pages.tar.gz && \
    mv /distributed-gh-pages /retro && \
    cd /retro && \
    npm i -g gulp && \
    npm i --only=dev && \
    adduser --disabled-password --gecos "retro" --home /retro --no-create-home retro && \
    chown -R retro:retro /retro

WORKDIR /retro
VOLUME /retro/data

USER retro

EXPOSE 4000 3030
CMD [ "npm", "run", "start" ]