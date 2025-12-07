FROM node:18-bullseye

# Install system dependencies for canvas and ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libxi-dev \
    libglu1-mesa-dev \
    libglew-dev \
    python3 \
    python-is-python3 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["xvfb-run", "--auto-servernum", "-s", "-ac -screen 0 1280x1024x24", "npm", "start"]
