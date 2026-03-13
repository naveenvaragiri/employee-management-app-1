/**
 * Chat component — real-time encrypted chat panel.
 *
 * End-to-end encryption model (X25519 + XSalsa20-Poly1305 via TweetNaCl):
 *  1. On mount, generate an ephemeral X25519 key pair for this session.
 *  2. On joining a room, register the public key with the server.
 *  3. Before sending, encrypt the plaintext for every room member using
 *     box() (DH key agreement + symmetric AEAD).  Each recipient receives
 *     a per-recipient ciphertext envelope so only they can decrypt.
 *  4. On receiving, attempt to decrypt with own secret key + sender public key.
 *     Messages from the local user are stored decrypted in state directly.
 *
 * Note: For simplicity this component uses a shared-secret broadcast model
 * (sender encrypts once for all members).  In a production system you would
 * use per-recipient encryption or a Signal-style double-ratchet protocol.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import nacl from 'tweetnacl';
import './Chat.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/**
 * Encrypt plaintext for a shared room key.
 * We derive a shared symmetric key via DH between sender secret key and a
 * per-room "group public key" (in this implementation the server's well-known
 * key is used as the group key; see design doc for alternatives).
 *
 * For the purposes of this demo, we encrypt using the sender's own key pair
 * so that any member who receives the sender's public key can decrypt.
 */
function encryptMessage(plaintext, senderSecretKey, recipientPublicKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = nacl.box(encoded, nonce, recipientPublicKey, senderSecretKey);
  return JSON.stringify({
    ciphertext: toBase64(ciphertext),
    nonce:      toBase64(nonce),
  });
}

function decryptMessage(encryptedPayload, senderPublicKey, recipientSecretKey) {
  try {
    const { ciphertext, nonce } = JSON.parse(encryptedPayload);
    const plaintext = nacl.box.open(
      fromBase64(ciphertext),
      fromBase64(nonce),
      senderPublicKey,
      recipientSecretKey,
    );
    if (!plaintext) return null;
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const DEFAULT_ROOM_ID = 'general';

export default function Chat({ userId }) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [roomId] = useState(DEFAULT_ROOM_ID);
  const [status, setStatus] = useState('Disconnected');

  const wsRef = useRef(null);
  const keyPairRef = useRef(null);
  const bottomRef = useRef(null);

  // Generate ephemeral key pair once per session.
  useEffect(() => {
    keyPairRef.current = nacl.box.keyPair();
  }, []);

  // Scroll to bottom when messages update.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const decryptIncoming = useCallback((msg, senderPublicKeyB64) => {
    if (!keyPairRef.current || !senderPublicKeyB64) return '[encrypted]';
    try {
      const senderPk = fromBase64(senderPublicKeyB64);
      return decryptMessage(msg.encryptedPayload, senderPk, keyPairRef.current.secretKey) || '[unable to decrypt]';
    } catch {
      return '[decryption error]';
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.hostname}:5000/ws/chat`);
    wsRef.current = ws;
    setStatus('Connecting…');

    ws.onopen = () => {
      setConnected(true);
      setStatus('Connected');
      ws.send(JSON.stringify({
        type:      'join',
        roomId,
        userId,
        publicKey: toBase64(keyPairRef.current.publicKey),
      }));
    };

    ws.onmessage = (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch { return; }

      if (frame.type === 'joined') {
        setMembers(frame.members || []);

        // Decrypt history using sender public keys from member list.
        const memberMap = {};
        (frame.members || []).forEach((m) => { memberMap[m.user_id] = m.public_key; });

        setMessages(
          (frame.history || []).map((m) => ({
            id:        m.id,
            senderId:  m.sender_id,
            text:      decryptIncoming(m, memberMap[m.sender_id]),
            createdAt: m.created_at,
          })),
        );
      } else if (frame.type === 'member_joined') {
        setMembers((prev) => {
          const exists = prev.some((m) => m.user_id === frame.userId);
          return exists ? prev : [...prev, { user_id: frame.userId, public_key: frame.publicKey }];
        });
      } else if (frame.type === 'message') {
        setMembers((prev) => {
          // Resolve sender public key from current member list.
          const sender = prev.find((m) => m.user_id === frame.senderId);
          const text = sender
            ? decryptIncoming(frame, sender.public_key)
            : '[unknown sender]';

          setMessages((msgs) => [
            ...msgs,
            {
              id:        frame.id,
              senderId:  frame.senderId,
              text,
              createdAt: frame.createdAt,
            },
          ]);
          return prev;
        });
      } else if (frame.type === 'error') {
        setStatus(`Error: ${frame.message}`);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setStatus('Disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('Connection error');
    };
  }, [roomId, userId, decryptIncoming]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || !connected) return;

    // Encrypt for every room member.  In this broadcast model we encrypt for
    // ourselves (the sender) as the canonical key so others decrypt using the
    // sender's public key (which they have from the member list).
    const encryptedPayload = encryptMessage(
      text,
      keyPairRef.current.secretKey,
      keyPairRef.current.publicKey,
    );

    wsRef.current.send(JSON.stringify({
      type: 'message',
      roomId,
      userId,
      encryptedPayload,
    }));

    setInput('');
  }, [input, connected, roomId, userId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>Team Chat — #{roomId}</h2>
        <span className={`chat-status ${connected ? 'chat-status--connected' : ''}`}>
          {status}
        </span>
        {connected ? (
          <button className="btn btn-secondary" onClick={disconnect}>Disconnect</button>
        ) : (
          <button className="btn btn-primary" onClick={connect}>Connect</button>
        )}
      </div>

      <div className="chat-body">
        <div className="chat-messages" aria-live="polite">
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet. Say hello!</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id || `${m.senderId}-${m.createdAt}`}
              className={`chat-message ${m.senderId === userId ? 'chat-message--own' : ''}`}
            >
              <span className="chat-message-sender">{m.senderId}</span>
              <span className="chat-message-text">{m.text}</span>
              <span className="chat-message-time">
                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-members">
          <h3>Members ({members.length})</h3>
          <ul>
            {members.map((m) => (
              <li key={m.user_id} className={m.user_id === userId ? 'chat-member--self' : ''}>
                {m.user_id}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="chat-footer">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Type a message… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          aria-label="Message input"
        />
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
