const mineflayer = require('mineflayer')
const { headless } = require('prismarine-viewer')

const bot = mineflayer.createBot({
  host: process.env.MC_HOST || 'mc-server',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: 'RecorderBot',
  auth: 'offline'
})

bot.once('spawn', async () => {
  console.log('Bot spawned, starting recording...')
  
  try {
    const recorder = await headless(bot, {
      output: '/output/recording.mp4',
      width: 1280,
      height: 720,
      frames: 600, // 20 seconds at 30fps
    })
    console.log('Recording started. Will run for ~20 seconds.')
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

  // Stop after 25 seconds (giving time for 600 frames)
  setTimeout(() => {
    console.log('Stopping bot...')
    clearInterval(interval)
    bot.quit()
    process.exit(0)
  }, 25000)
})

bot.on('error', (err) => {
  console.error('Bot error:', err)
})

bot.on('kicked', (reason) => {
  console.log('Bot kicked:', reason)
})
