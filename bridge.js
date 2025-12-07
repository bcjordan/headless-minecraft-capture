const dgram = require('dgram');
const net = require('net');

// Configuration
const TARGET_HOST = process.argv[2] || 'localhost';
const TARGET_PORT = parseInt(process.argv[3] || '25565');
const MOTD = process.argv[4] || 'Remote Server';

if (!process.argv[2]) {
    console.log("Usage: node bridge.js <TARGET_HOST> <TARGET_PORT> [MOTD]");
    console.log("Example: node bridge.js 1.2.3.4 25565 'My Cool Server'");
    process.exit(1);
}

// 1. Setup TCP Proxy
// We need a local server that the Minecraft client will actually connect to.
const proxyServer = net.createServer((clientSocket) => {
    console.log(`[Proxy] New connection from ${clientSocket.remoteAddress}`);

    const serverSocket = new net.Socket();
    
    serverSocket.connect(TARGET_PORT, TARGET_HOST, () => {
        // console.log(`[Proxy] Connected to target ${TARGET_HOST}:${TARGET_PORT}`);
        clientSocket.pipe(serverSocket);
        serverSocket.pipe(clientSocket);
    });

    serverSocket.on('error', (err) => {
        console.error(`[Proxy] Target error: ${err.message}`);
        clientSocket.end();
    });

    clientSocket.on('error', (err) => {
        console.error(`[Proxy] Client error: ${err.message}`);
        serverSocket.end();
    });
    
    clientSocket.on('close', () => {
        serverSocket.end();
    });
    
    serverSocket.on('close', () => {
        clientSocket.end();
    });
});

// Listen on a random available port (port 0 lets OS choose)
proxyServer.listen(0, () => {
    const localPort = proxyServer.address().port;
    console.log(`[Proxy] Listening on port ${localPort}, forwarding to ${TARGET_HOST}:${TARGET_PORT}`);
    
    // 2. Start UDP Broadcaster
    startBroadcaster(localPort);
});

function startBroadcaster(localPort) {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const MULTICAST_ADDR = '224.0.2.60';
    const MULTICAST_PORT = 4445;
    
    // The payload Minecraft expects: [MOTD]AD[PORT]
    // The PORT here must be the local port of our proxy, because the client assumes the sender IP is the server IP.
    const message = Buffer.from(`[${MOTD}]AD[${localPort}]`);

    socket.bind(() => {
        socket.setBroadcast(true);
        socket.setMulticastTTL(128); // Allow hopping if needed, though usually local
        // socket.addMembership(MULTICAST_ADDR); // Not strictly needed for sending, but good practice if we were listening
    });

    console.log(`[Broadcaster] Announcing LAN world every 1.5s...`);
    
    setInterval(() => {
        socket.send(message, 0, message.length, MULTICAST_PORT, MULTICAST_ADDR, (err) => {
            if (err) console.error(`[Broadcaster] Error: ${err}`);
        });
    }, 1500); // Minecraft broadcasts every 1.5 seconds roughly
}
