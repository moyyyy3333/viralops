FROM node:20-slim

# Install ffmpeg + yt-dlp for video processing
RUN apt-get update && apt-get install -y ffmpeg yt-dlp && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN echo "Build complete — using tsx runtime"

CMD ["npm", "start"]
