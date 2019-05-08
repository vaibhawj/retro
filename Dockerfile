FROM node:8

ADD https://github.com/waninlezu/distributed/archive/gh-pages.tar.gz /Downloads/gh-pages.tar.gz

RUN tar -xzf /Downloads/gh-pages.tar.gz && \
    mv /distributed-gh-pages /retro && \
    npm i -g gulp && \
    cd /retro;npm i --only=dev && \
    npm cache clean --force && \
    adduser --disabled-password --gecos "retro" --home /retro --no-create-home retro && \
    chown -R retro:retro /retro

WORKDIR /retro
VOLUME /retro/data

USER retro

EXPOSE 4000 3030
CMD [ "npm", "run", "start" ]