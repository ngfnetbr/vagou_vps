FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
'server {' \
'    listen 80;' \
'    server_name _;' \
'' \
'    root /usr/share/nginx/html;' \
'    index index.html;' \
'' \
'    location / {' \
'        try_files $uri /index.html;' \
'    }' \
'}' \
> /etc/nginx/conf.d/default.conf

EXPOSE 80
