# ===== Build stage =====
FROM node:18-bullseye AS build
WORKDIR /app

# ใช้ ARG เพื่อรับค่าตอน build
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL

# ส่งค่า ARG ไปเป็น ENV เพื่อให้ Next.js เห็นตอน build
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# ติดตั้ง dependencies
COPY package*.json ./
RUN npm ci

# คัดลอกโค้ดทั้งหมด
COPY . ./

# Generate Prisma client และ build Next.js
RUN npx prisma generate
RUN npm run build

# ===== Production stage =====
FROM node:18-bullseye AS prod
WORKDIR /app

# คัดลอกไฟล์จาก build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/prisma ./prisma

# ติดตั้ง MySQL client
RUN apt update && apt install -y default-mysql-client

# เปิด port
EXPOSE 3000/tcp

# รัน Next.js
CMD ["npm", "start"]
