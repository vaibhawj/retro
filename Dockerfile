FROM node:10-alpine

ADD https://github.com/waninlezu/distributed/archive/gh-pages.tar.gz /Downloads/gh-pages.tar.gz

RUN tar -xzf /Downloads/gh-pages.tar.gz && \
    mv /distributed-gh-pages /retro && \
    cd /retro && \
    npm i -g gulp && \
    npm i

WORKDIR /retro
VOLUME /retro/data

EXPOSE 4000 3030
CMD [ "npm", "run", "start" ]