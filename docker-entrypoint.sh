#!/bin/sh
set -eu

: "${PORT:=80}"
: "${BACKEND_URL:=http://backend:8080}"

envsubst '${PORT} ${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
