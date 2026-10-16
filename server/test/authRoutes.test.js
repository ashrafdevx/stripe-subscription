const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { test } = require('node:test');
const createAuthRouter = require('../src/routes/authRoutes');

async function startServer(options, t) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(options));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  return `http://127.0.0.1:${server.address().port}`;
}

test('registration returns a neutral success response', async (t) => {
  let submittedCredentials;
  const service = {
    registerUser: async (credentials) => { submittedCredentials = credentials; },
  };
  const baseUrl = await startServer({ service }, t);

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'correct horse battery staple' }),
  });

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    message: 'If an account can be created, you can now sign in.',
  });
  assert.deepEqual(submittedCredentials, {
    email: 'user@example.com',
    password: 'correct horse battery staple',
  });
});

test('login rejects invalid credentials with a generic response', async (t) => {
  const service = {
    loginUser: async () => null,
  };
  const baseUrl = await startServer({ service }, t);

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'missing@example.com', password: 'wrong password' }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Invalid email or password.' });
});

test('login creates a session and returns an access token without exposing refresh credentials', async (t) => {
  const service = {
    loginUser: async () => ({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'must-not-leak',
    }),
    startUserSession: async () => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'user@example.com', role: 'customer' },
    }),
  };
  const baseUrl = await startServer({ service }, t);

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'correct password' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    accessToken: 'access-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: { id: 'user-1', email: 'user@example.com', role: 'customer' },
  });
  assert.match(response.headers.get('set-cookie'), /refreshToken=refresh-token/);
  assert.doesNotMatch(response.headers.get('set-cookie'), /HttpOnly=false/i);
});

test('registration reports invalid input without invoking account creation', async (t) => {
  const service = {
    registerUser: async () => {
      const error = new Error('Enter a valid email address.');
      error.statusCode = 400;
      throw error;
    },
  };
  const baseUrl = await startServer({ service }, t);

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid', password: 'short' }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Enter a valid email address.' });
});

test('refresh rotates the refresh cookie and returns a short-lived access token', async (t) => {
  const service = {
    refreshUserSession: async (token) => {
      assert.equal(token, 'old-refresh-token');
      return {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'user-1', email: 'user@example.com', role: 'customer' },
      };
    },
  };
  const baseUrl = await startServer({ service }, t);

  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { cookie: 'refreshToken=old-refresh-token' },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).accessToken, 'new-access-token');
  assert.match(response.headers.get('set-cookie'), /refreshToken=new-refresh-token/);
});

test('logout revokes the presented refresh token and clears its cookie', async (t) => {
  let revokedToken;
  const sessions = {
    revokeSession: async (token) => { revokedToken = token; },
  };
  const baseUrl = await startServer({ sessions }, t);

  const response = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { cookie: 'refreshToken=old-refresh-token' },
  });

  assert.equal(response.status, 204);
  assert.equal(revokedToken, 'old-refresh-token');
  assert.match(response.headers.get('set-cookie'), /refreshToken=;/);
});
