import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Chat from './Chat';

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Stub out tweetnacl so tests don't require native crypto
jest.mock('tweetnacl', () => ({
  box: {
    keyPair: () => ({
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(32).fill(2),
    }),
    nonceLength: 24,
    open: jest.fn(() => new TextEncoder().encode('hello')),
  },
  randomBytes: (n) => new Uint8Array(n),
}));

// Stub WebSocket
class MockWebSocket {
  constructor() {
    this.readyState = 1; // OPEN
    MockWebSocket.instance = this;
  }
  send() {}
  close() { if (this.onclose) this.onclose(); }
}
MockWebSocket.OPEN = 1;
global.WebSocket = MockWebSocket;

describe('Chat component', () => {
  beforeEach(() => {
    jest.spyOn(window, 'sessionStorage', 'get').mockReturnValue({
      getItem: () => 'test-user',
      setItem: () => {},
    });
  });

  test('renders chat panel with connect button', () => {
    render(<Chat userId="test-user" />);
    expect(screen.getByText(/Team Chat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  test('shows Connecting after clicking Connect', () => {
    render(<Chat userId="test-user" />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });

  test('send button is disabled when disconnected', () => {
    render(<Chat userId="test-user" />);
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  test('message input is disabled when disconnected', () => {
    render(<Chat userId="test-user" />);
    expect(screen.getByLabelText(/message input/i)).toBeDisabled();
  });

  test('shows empty state message when no messages', () => {
    render(<Chat userId="test-user" />);
    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();
  });
});
