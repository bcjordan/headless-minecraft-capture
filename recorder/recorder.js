const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalFollow } } = require('mineflayer-pathfinder')
const headless = require('./headless_custom')
const fs = require('fs')
const path = require('path')

// Ensure output directory exists
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const OUTPUT_FILE = `/output/recording-${timestamp}.mp4`
const OUTPUT_DIR = path.dirname(OUTPUT_FILE)
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const bot = mineflayer.createBot({
  host: process.env.MC_HOST || 'mc-server',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: 'RecorderBot',
  auth: 'offline'
})

bot.loadPlugin(pathfinder)

bot.once('spawn', async () => {
  console.log('Bot spawned, starting recording...')
  
  const targetName = process.env.TARGET
  if (targetName) {
    console.log(`Targeting player: ${targetName}`)
    const followLoop = setInterval(() => {
      const target = bot.players[targetName]?.entity
      if (target) {
        const defaultMove = new Movements(bot)
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalFollow(target, 3), true)
      } else {
        console.log('Waiting for target...')
      }
    }, 1000)
    
    // Cleanup interval on exit
    bot.on('end', () => clearInterval(followLoop))
  }
  try {
    const recorder = await headless(bot, {
      output: OUTPUT_FILE,
      width: 1280,
      height: 720,
      frames: 60 * 20, // 20 seconds at 60fps
      fps: 60,
      logFFMPEG: true
    })
    console.log('Recording started. Will run for 20 seconds of video time.')

    // Listen for ffmpeg to finish
    recorder.on('close', (code) => {
      console.log(`Recording finished (ffmpeg exited with code ${code}). Stopping bot...`)
      clearInterval(interval)
      bot.quit()
      process.exit(code)
    })

    // Handle graceful shutdown
    const stopRecording = () => {
      console.log('Stopping recording gracefully...')
      if (recorder.stdin && !recorder.stdin.destroyed) {
        recorder.stdin.end()
      }
    }

    process.on('SIGINT', stopRecording)
    process.on('SIGTERM', stopRecording)

  } catch (err) {
    console.error('Error starting viewer:', err)
  }

  // Make the bot look around and move
  let yaw = 0
  const interval = setInterval(() => {
    yaw += 0.1
    bot.look(yaw, 0)
    bot.setControlState('forward', true)
    // Jump occasionally
    if (Math.random() < 0.1) {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 500)
    }
  }, 50)

  // Safety timeout (5 minutes) in case recording hangs
  setTimeout(() => {
    console.log('Recording timed out (5m). Force quitting...')
    process.exit(1)
  }, 300000)
})

bot.on('error', (err) => {
  console.error('Bot error:', err)
})

bot.on('kicked', (reason) => {
  console.log('Bot kicked:', reason)
})
