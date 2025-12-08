# Minecraft Recorder Demo

This project demonstrates how to record Minecraft gameplay video from a headless Mineflayer bot running inside a Docker container and view it via a web interface.

## Services

1.  **`mc-server`**: A standard Minecraft server (Java Edition 1.20.1) running in Docker.
2.  **`recorder`**: A Node.js service using `mineflayer` to connect to the server and `prismarine-viewer` (headless) to render the view.
    *   It uses `xvfb` to simulate a display for WebGL rendering.
    *   It uses `ffmpeg` to encode the rendered frames into an MP4 video at **60 FPS**.
3.  **`web`**: A Bun-based web server that provides a UI to browse and watch recordings.

## Usage

1.  **Start the stack**:
    ```bash
    docker-compose up --build
    ```

2.  **Wait for recording**:
    *   The server will start (this takes a minute).
    *   The bot will join automatically once the server is ready.
    *   The bot will record for approximately 20 seconds.
    *   The bot will disconnect and the container will exit.

3.  **View the video**:
    *   Open your browser to [http://localhost:3001](http://localhost:3001).
    *   Click on `recording.mp4` to watch it.

## Configuration

*   **Recording Duration**: Modify `recorder/recorder.js` to change the number of frames or duration.
*   **Resolution**: Modify `recorder/recorder.js` to change the `width` and `height`.
*   **FPS**: Modify `recorder/recorder.js` to change the `fps` option (default 60).
*   **Minecraft Version**: Change `VERSION` in `docker-compose.yml`. Note that you may need to update `mineflayer` in `recorder/package.json` for newer versions.

## Development

*   **Web Interface**: The web interface code is in `web/index.ts`. It uses `Bun.serve`.
*   **Recorder**: The recorder logic is in `recorder/recorder.js` and uses a custom headless script `recorder/headless_custom.js` to support FPS configuration.
