# One image for every FitLife service; SERVICE_FILE picks which one runs.
FROM node:22-alpine
WORKDIR /app
COPY shared ./shared
COPY services ./services
COPY gateway ./gateway
ENV NODE_ENV=production
ARG SERVICE_FILE=gateway/gateway.js
ENV SERVICE_FILE=${SERVICE_FILE}
CMD ["sh", "-c", "node $SERVICE_FILE"]
