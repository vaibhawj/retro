FROM node:8

MAINTAINER waninlezu

ADD https://github.com/waninlezu/distributed/archive/gh-pages.tar.gz /Downloads/gh-pages.tar.gz

RUN tar -xzf /Downloads/gh-pages.tar.gz && \
    mv /distributed-gh-pages /retro && \
    npm i -g gulp && \
    cd /retro;npm i --only-dev && \
    adduser --disabled-password --gecos "retro" --home /retro --no-create-home retro && \
    chown -R retro:retro /retro

EXPOSE 4000 3030

WORKDIR /retro
VOLUME /data

USER retro

CMD ["gulp" "run"]