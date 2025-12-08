# Using Bodycam Recording with Minecraft Bots

This guide explains how to integrate "bodycam" style video recording into existing Mineflayer bot projects (like `opencode-minecraft`). This allows you to programmatically capture video of what your bot is seeing and doing, which is incredibly useful for debugging, demos, or just archiving cool moments.

## Core Concept

The recording logic relies on `prismarine-viewer` running in "headless" mode. This spins up an off-screen render loop (using `xvfb` on Linux/Docker) that pipes frames to `ffmpeg` to create a video file.

You can trigger this recording:
1.  **On Demand**: When a specific command is run.
2.  **Event-Based**: When the bot starts a complex task.
3.  **Always On**: Recording a rolling buffer or chunks (requires more storage management).

## Integration Steps

### 1. Dependencies

Your bot project needs the following dependencies:

```json
{
  "dependencies": {
    "mineflayer": "4.33.0",
    "prismarine-viewer": "1.33.0",
    "canvas": "^2.11.2",
    "node-canvas-webgl": "^0.3.0"
  }
}
```

**Note:** Version matching is critical! Ensure `mineflayer` and `prismarine-viewer` are compatible with the Minecraft version you are targeting (e.g., 1.20.4).

### 2. Docker Environment

Since headless rendering requires a virtual display, your bot must run in a Docker container with the necessary system libraries.

Add these to your `Dockerfile`:

```dockerfile
RUN apt-get update && apt-get install -y \
    ffmpeg \
    xvfb \
    libxi-dev \
    libglu1-mesa-dev \
    libglew-dev \
    libcairo2-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Run with xvfb-run
CMD ["xvfb-run", "--auto-servernum", "-s", "-ac -screen 0 1280x1024x24", "npm", "start"]
```

### 3. The Recorder Module

You can create a reusable `Bodycam` class to manage recording sessions.

```javascript
// bodycam.js
const { headless } = require('prismarine-viewer')
const path = require('path')
const fs = require('fs')

class Bodycam {
  constructor(bot) {
    this.bot = bot
    this.recorder = null
    this.isRecording = false
  }

  async start(filename = 'recording.mp4', duration = 0) {
    if (this.isRecording) return

    console.log(`[Bodycam] Starting recording: ${filename}`)
    this.isRecording = true
    
    // Ensure directory exists
    const dir = path.dirname(filename)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    try {
      // Start headless viewer
      this.recorder = await headless(this.bot, {
        output: filename,
        width: 1280,
        height: 720,
        logFFMPEG: true,
        fps: 60
      })

      // Optional: Auto-stop after duration
      if (duration > 0) {
        setTimeout(() => this.stop(), duration)
      }
      
    } catch (err) {
      console.error('[Bodycam] Failed to start:', err)
      this.isRecording = false
    }
  }

  stop() {
    if (!this.isRecording || !this.recorder) return

    console.log('[Bodycam] Stopping recording...')
    // The headless viewer returns the ffmpeg process. 
    // We can signal it to stop by closing stdin or killing it.
    // prismarine-viewer usually handles cleanup if we destroy the viewer, 
    // but we might need to be explicit depending on the implementation.
    
    if (this.recorder.stdin) {
      this.recorder.stdin.end()
    }
    
    this.isRecording = false
    this.recorder = null
  }
}

module.exports = Bodycam
```

### 4. Integration Example

Here is how you would use it in your main bot file:

```javascript
const mineflayer = require('mineflayer')
const Bodycam = require('./bodycam')

const bot = mineflayer.createBot({ ... })
const camera = new Bodycam(bot)

bot.on('chat', async (username, message) => {
  if (message === 'start task') {
    // Start recording the task
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await camera.start(`./recordings/task-${timestamp}.mp4`)
    
    bot.chat('Starting task with bodycam on!')
    await performComplexTask()
    
    camera.stop()
    bot.chat('Task complete, video saved.')
  }
})

async function performComplexTask() {
  // ... bot logic ...
}
```

## Advanced Ideas

### "Dashcam" Mode
Keep a rolling buffer of the last 30 seconds. This is harder with direct-to-file ffmpeg, but you could record to small 10-second chunks (`segment` muxer in ffmpeg) and keep only the last N chunks. When an "incident" happens (e.g., bot dies, error occurs), save the recent chunks to a permanent folder.

### Live Streaming
Instead of saving to a file, pipe the `ffmpeg` output to an RTMP server (like YouTube or Twitch) or a local HLS server to watch the bot in real-time via a web browser.

```javascript
// Stream to local RTMP server
await camera.start('rtmp://localhost/live/bot1')
```

### Multi-Bot Squad View
If you have multiple bots, run a separate `web` service that aggregates their streams or recordings. You can mount a shared volume (like we did with `./recordings`) so a central dashboard can show "Mission Logs" from all bots.
