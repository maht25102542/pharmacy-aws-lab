FROM nginx:alpine

ARG APP_VERSION=dev

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
RUN sed -i "s/__VERSION__/${APP_VERSION}/" /usr/share/nginx/html/index.html

EXPOSE 80
