# ============================================
# DOCKERFILE PARA COOLIFY - LINVENTORY
# ============================================

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de build para variables de entorno de Vite (se inyectan durante npm run build)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG VITE_GROQ_API_KEY
ARG GROQ_API_KEY
ARG VITE_GOOGLE_API_KEY
ARG GOOGLE_API_KEY
ARG VITE_GEMINI_API_KEY
ARG GEMINI_API_KEY
ARG VITE_GOOGLE_SEARCH_ENGINE_ID
ARG GOOGLE_SEARCH_ENGINE_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV VITE_GROQ_API_KEY=$VITE_GROQ_API_KEY
ENV GROQ_API_KEY=$GROQ_API_KEY
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV GOOGLE_API_KEY=$GOOGLE_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV VITE_GOOGLE_SEARCH_ENGINE_ID=$VITE_GOOGLE_SEARCH_ENGINE_ID
ENV GOOGLE_SEARCH_ENGINE_ID=$GOOGLE_SEARCH_ENGINE_ID

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar la aplicación para producción
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine AS production

WORKDIR /app

# Instalar serve para servir la SPA
RUN npm install -g serve

# Copiar build desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Exponer puerto 3000
EXPOSE 3000

# Comando para servir la aplicación en modo Single Page Application (-s) en el puerto 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
