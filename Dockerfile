FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm config set dangerously-allow-all-builds true
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

ENV PORT=3000

CMD ["sh", "-c", "until npx prisma db push; do echo 'Esperando a que Postgres este listo...'; sleep 2; done && pnpm prisma db seed && node dist/main.js"]
