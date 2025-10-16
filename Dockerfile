FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Run Next.js app
FROM node:18-alpine AS prod
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next/
COPY --from=build /app/public ./public/
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate
RUN npm install --only=production
RUN npm install ts-node typescript @types/node
EXPOSE 3000/tcp
CMD ["npm", "start"]
ENV DATABASE_URL="mysql://root:@localhost:3306/donation_swipe"
ENV NEXT_PUBLIC_SITE_URL="https://donation-swipe.cpkku.com"
