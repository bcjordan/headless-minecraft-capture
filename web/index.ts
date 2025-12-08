import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { stat } from "node:fs/promises";

const RECORDINGS_DIR = "/app/recordings";

export default {
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // API: Start Recording
    if (url.pathname === '/api/record' && req.method === 'POST') {
      try {
        const body = await req.json();
        const response = await fetch('http://recorder:8080/record', { 
          method: 'POST',
          body: JSON.stringify(body)
        });
        if (response.ok) {
          return new Response(JSON.stringify({ success: true }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        } else {
          return new Response(JSON.stringify({ error: 'Failed to start' }), { status: 500 });
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // UI: Home Page
    if (url.pathname === '/') {
      try {
        const files = await readdir(RECORDINGS_DIR);
        const mp4Files = files.filter(f => f.endsWith('.mp4'));
        
        // Sort by modification time (newest first)
        const filesWithStats = await Promise.all(mp4Files.map(async f => {
          const s = await stat(join(RECORDINGS_DIR, f));
          return { name: f, mtime: s.mtimeMs };
        }));
        
        filesWithStats.sort((a, b) => b.mtime - a.mtime);

        const fileListHtml = filesWithStats.map(f => `
          <div class="recording-item">
            <span class="recording-name">${f.name}</span>
            <button onclick="playVideo('${f.name}')">Play</button>
          </div>
        `).join('');

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Minecraft Recordings</title>
            <style>
              body { font-family: sans-serif; background: #1a1a1a; color: #fff; margin: 0; padding: 20px; }
              h1 { border-bottom: 1px solid #333; padding-bottom: 10px; }
              .container { display: flex; gap: 20px; }
              .list { width: 300px; background: #2a2a2a; padding: 10px; border-radius: 8px; max-height: 80vh; overflow-y: auto; }
              .player { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; border-radius: 8px; min-height: 480px; }
              .recording-item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #333; }
              .recording-item:hover { background: #333; }
              button { cursor: pointer; background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; }
              button:hover { background: #0056b3; }
              video { max-width: 100%; max-height: 80vh; }
              .controls { margin-bottom: 20px; display: flex; gap: 10px; align-items: center; }
              .record-btn { background: #dc3545; font-size: 1.2em; padding: 10px 20px; }
              .record-btn:hover { background: #a71d2a; }
              .record-btn:disabled { background: #555; cursor: not-allowed; }
              input { padding: 10px; border-radius: 4px; border: 1px solid #333; background: #2a2a2a; color: #fff; }
            </style>
          </head>
          <body>
            <h1>Minecraft Recordings</h1>
            <div class="controls">
              <input id="targetName" type="text" placeholder="Follow Player (optional)">
              <button id="recordBtn" class="record-btn" onclick="startRecording()">Start New Recording</button>
              <span id="status" style="margin-left: 10px; color: #aaa;"></span>
            </div>
            <div class="container">
              <div class="list">
                ${fileListHtml || '<div style="padding:10px; color:#aaa">No recordings found</div>'}
              </div>
              <div class="player">
                <video id="videoPlayer" controls>
                  <p>Select a video to play</p>
                </video>
              </div>
            </div>
            <script>
              function playVideo(filename) {
                const video = document.getElementById('videoPlayer');
                video.src = '/recordings/' + filename;
                video.play();
              }

              async function startRecording() {
                const btn = document.getElementById('recordBtn');
                const status = document.getElementById('status');
                const target = document.getElementById('targetName').value;
                
                btn.disabled = true;
                status.textContent = 'Requesting...';
                
                try {
                  const res = await fetch('/api/record', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target })
                  });
                  
                  if (res.ok) {
                    status.textContent = 'Recording started! (20s)';
                    setTimeout(() => { 
                      status.textContent = ''; 
                      btn.disabled = false;
                      location.reload(); 
                    }, 22000);
                  } else {
                    status.textContent = 'Failed to start';
                    btn.disabled = false;
                  }
                } catch (e) {
                  status.textContent = 'Error: ' + e.message;
                  btn.disabled = false;
                }
              }
            </script>
          </body>
          </html>
        `;

        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      } catch (e) {
        return new Response("Error listing files: " + e.message, { status: 500 });
      }
    }

    // Serve Static Files (Recordings)
    if (url.pathname.startsWith("/recordings/")) {
      const filename = url.pathname.replace("/recordings/", "");
      const filePath = join(RECORDINGS_DIR, filename);
      const file = Bun.file(filePath);
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
};
