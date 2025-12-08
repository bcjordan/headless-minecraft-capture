const http = require('http')
const { spawn } = require('child_process')

const PORT = 8080
let recordingProcess = null

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === '/record' && req.method === 'POST') {
    if (recordingProcess) {
      res.writeHead(409, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Recording already in progress' }))
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      let target = ''
      try {
        const data = JSON.parse(body)
        target = data.target || ''
      } catch (e) {}

      console.log(`Starting new recording session... Target: ${target || 'None'}`)
      
      // Spawn the recorder script with inherited stdio and custom env
      recordingProcess = spawn('node', ['recorder.js'], { 
        stdio: 'inherit',
        env: { ...process.env, TARGET: target }
      })

      recordingProcess.on('close', (code) => {
        console.log(`Recording process exited with code ${code}`)
        recordingProcess = null
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Recording started' }))
    })
  } else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ recording: !!recordingProcess }))
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`Recorder control server listening on port ${PORT}`)
})
