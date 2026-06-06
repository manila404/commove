import type { IncomingMessage, ServerResponse } from 'http';
import * as admin from 'firebase-admin';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  query?: any;
}

interface ExtendedResponse extends ServerResponse {
  status: (statusCode: number) => ExtendedResponse;
  json: (body: any) => void;
}

const initAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are not configured.");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });

  return admin.firestore();
};

const MAX_ATTEMPTS = 5;

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { email, enteredCode, uid } = body || {};

    if (!email || !enteredCode) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Email and enteredCode are required' }));
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const docId = uid || `otp_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const db = initAdmin();
    const docRef = db.collection('otpCodes').doc(docId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      res.statusCode = 200;
      res.end(JSON.stringify({ result: 'not_found' }));
      return;
    }

    const record = snapshot.data();
    if (!record) {
      res.statusCode = 200;
      res.end(JSON.stringify({ result: 'not_found' }));
      return;
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      res.statusCode = 200;
      res.end(JSON.stringify({ result: 'too_many_attempts' }));
      return;
    }

    if (Date.now() > record.expiresAt) {
      res.statusCode = 200;
      res.end(JSON.stringify({ result: 'expired' }));
      return;
    }

    if (record.code !== enteredCode.trim()) {
      await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      res.statusCode = 200;
      res.end(JSON.stringify({ result: 'invalid' }));
      return;
    }

    // Success: invalidate OTP record by deleting it
    await docRef.delete();

    res.statusCode = 200;
    res.end(JSON.stringify({ result: 'valid' }));
  } catch (error: any) {
    console.error('[verify-otp] Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}
