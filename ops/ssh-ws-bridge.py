#!/usr/bin/env python3
"""WebSocket -> localhost:22 bridge, so SSH can ride a plain web connection. Exposes nothing new: it only reaches the
same sshd that port 22 already serves (key-only). Listens on 127.0.0.1:8081; Caddy forwards /ssh-ws to it."""
import asyncio
import websockets

async def pipe_ws_to_tcp(ws, writer):
    async for msg in ws:
        writer.write(msg if isinstance(msg, bytes) else msg.encode())
        await writer.drain()
    writer.close()

async def pipe_tcp_to_ws(reader, ws):
    while True:
        data = await reader.read(65536)
        if not data:
            break
        await ws.send(data)
    await ws.close()

async def handler(ws, path=None):
    reader, writer = await asyncio.open_connection("127.0.0.1", 22)
    await asyncio.gather(pipe_ws_to_tcp(ws, writer), pipe_tcp_to_ws(reader, ws), return_exceptions=True)

async def main():
    async with websockets.serve(handler, "127.0.0.1", 8081, max_size=None, ping_interval=20):
        await asyncio.Future()

asyncio.run(main())
