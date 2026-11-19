"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

type Signal = { kind: string; payload: string; at: string };
type Status = "idle" | "waiting" | "connecting" | "connected" | "error";

const ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }]
    : []),
];

/**
 * Two-person WebRTC call. The host (psychologist) makes the offer whenever
 * the guest says hello, so either side can join first or rejoin after a
 * dropped connection. Media is peer-to-peer and DTLS-SRTP encrypted.
 */
export function P2PCall({
  roomId,
  role,
  otherName,
  t,
  onLeave,
}: {
  roomId: string;
  role: "host" | "guest";
  otherName: string;
  t: { join: string; leave: string; mute: string; unmute: string; cameraOff: string; cameraOn: string; waiting: string; connecting: string; connected: string; permission: string; devicesError: string; privacy: string };
  onLeave: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const local = useRef<HTMLVideoElement>(null);
  const remote = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const pending = useRef<RTCIceCandidateInit[]>([]);
  const after = useRef<string>("");
  const active = useRef(false);

  const send = (kind: string, payload: unknown = "") =>
    fetch(`/api/video/${roomId}/signal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, payload: typeof payload === "string" ? payload : JSON.stringify(payload) }) });

  function newPeer() {
    pc.current?.close();
    const peer = new RTCPeerConnection({ iceServers: ICE });
    stream.current?.getTracks().forEach((track) => peer.addTrack(track, stream.current!));
    peer.onicecandidate = (e) => e.candidate && send("candidate", e.candidate.toJSON());
    peer.ontrack = (e) => {
      if (remote.current) remote.current.srcObject = e.streams[0];
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("connected");
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") setStatus("waiting");
    };
    pending.current = [];
    pc.current = peer;
    return peer;
  }

  async function handle(s: Signal) {
    if (s.kind === "hello") {
      if (role === "host") {
        setStatus("connecting");
        const peer = newPeer();
        await peer.setLocalDescription(await peer.createOffer());
        await send("offer", peer.localDescription);
      } else {
        // The host is here: say hello back so they send an offer.
        await send("hello");
      }
    } else if (s.kind === "offer" && role === "guest") {
      setStatus("connecting");
      const peer = newPeer();
      await peer.setRemoteDescription(JSON.parse(s.payload));
      for (const c of pending.current.splice(0)) await peer.addIceCandidate(c).catch(() => {});
      await peer.setLocalDescription(await peer.createAnswer());
      await send("answer", peer.localDescription);
    } else if (s.kind === "answer" && role === "host" && pc.current) {
      await pc.current.setRemoteDescription(JSON.parse(s.payload));
      for (const c of pending.current.splice(0)) await pc.current.addIceCandidate(c).catch(() => {});
    } else if (s.kind === "candidate" && pc.current) {
      const c = JSON.parse(s.payload);
      if (pc.current.remoteDescription) await pc.current.addIceCandidate(c).catch(() => {});
      else pending.current.push(c);
    } else if (s.kind === "bye") {
      pc.current?.close();
      pc.current = null;
      if (remote.current) remote.current.srcObject = null;
      setStatus("waiting");
    }
  }

  async function poll() {
    while (active.current) {
      try {
        const res = await fetch(`/api/video/${roomId}/signal?after=${encodeURIComponent(after.current)}`, { cache: "no-store" });
        if (res.ok) {
          const data: { now: string; signals: Signal[] } = await res.json();
          for (const s of data.signals) {
            after.current = s.at;
            await handle(s);
          }
          if (!data.signals.length && !after.current) after.current = data.now;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async function join() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setStatus("error");
      return;
    }
    if (local.current) local.current.srcObject = stream.current;
    setStatus("waiting");
    active.current = true;
    after.current = new Date(Date.now() - 60_000).toISOString();
    await send("hello");
    poll();
  }

  function leave() {
    active.current = false;
    send("bye");
    pc.current?.close();
    stream.current?.getTracks().forEach((track) => track.stop());
    window.location.href = onLeave;
  }

  useEffect(() => {
    const onUnload = () => navigator.sendBeacon?.(`/api/video/${roomId}/signal`, new Blob([JSON.stringify({ kind: "bye", payload: "" })], { type: "application/json" }));
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      active.current = false;
      pc.current?.close();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId]);

  const toggle = (kind: "audio" | "video") => {
    const tracks = kind === "audio" ? stream.current?.getAudioTracks() : stream.current?.getVideoTracks();
    tracks?.forEach((track) => (track.enabled = !track.enabled));
    if (kind === "audio") setMuted((m) => !m);
    else setCameraOff((c) => !c);
  };

  const statusText = { idle: t.permission, waiting: t.waiting.replace("{name}", otherName), connecting: t.connecting, connected: t.connected, error: t.devicesError }[status];
  const ctl = "grid size-12 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur hover:bg-black/70";

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0d1615]">
        <video ref={remote} autoPlay playsInline className="size-full object-cover" />
        {status !== "connected" && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-white/80" aria-live="polite">{statusText}</p>
        )}
        <video ref={local} autoPlay playsInline muted className="absolute bottom-3 right-3 aspect-video w-28 rounded-xl border border-white/20 object-cover sm:w-44" />
        {status !== "idle" && status !== "error" && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
            <button type="button" onClick={() => toggle("audio")} aria-label={muted ? t.unmute : t.mute} aria-pressed={muted} className={ctl}>
              {muted ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => toggle("video")} aria-label={cameraOff ? t.cameraOn : t.cameraOff} aria-pressed={cameraOff} className={ctl}>
              {cameraOff ? <VideoOff className="size-5" aria-hidden="true" /> : <Video className="size-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={leave} aria-label={t.leave} className="grid size-12 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700">
              <PhoneOff className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {(status === "idle" || status === "error") && (
        <button type="button" onClick={join} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-ink hover:bg-primary-hover">
          <Video className="size-5" aria-hidden="true" />
          {t.join}
        </button>
      )}
      <p className="text-xs text-muted">{t.privacy.replace("{name}", otherName)}</p>
    </div>
  );
}
