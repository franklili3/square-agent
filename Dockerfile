# Stage 1 — lightweight runtime
FROM node:22-slim

WORKDIR /app

# Copy project files
COPY . .

# No npm dependencies — uses native fetch only
# Install CLI globally
RUN npm link

# Default: run pipeline in watch mode
CMD ["node", "news-pipeline/pipeline.mjs", "--watch"]
