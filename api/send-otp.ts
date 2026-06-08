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

// Initialize Firebase Admin SDK
const initAdmin = () => {
  const firebaseAdmin = (admin as any).default || admin;

  if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
    return firebaseAdmin.firestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] Missing credentials. Using client configuration fallback if available.");
    throw new Error("Firebase Admin environment variables are not configured.");
  }

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });

  return firebaseAdmin.firestore();
};

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  // Add CORS headers for local/cross-origin testing if needed
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
    // In Vercel, req.body is parsed automatically. In some environments it might be a string.
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { email, userName, uid } = body || {};

    if (!email) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Email is required' }));
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const docId = uid || `otp_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Initialize DB and Store OTP securely
    const db = initAdmin();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    await db.collection('otpCodes').doc(docId).set({
      userId: uid || docId,
      email: cleanEmail,
      code: otp,
      createdAt: Date.now(),
      expiresAt,
      attempts: 0,
    });

    console.info(`[OTP] Stored code securely for ${cleanEmail}`);

    // 3. Send email using EmailJS REST API
    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      // Fallback/Dev mode logging if keys aren't set
      console.info(`[OTP - DEV MODE] Code for ${cleanEmail}: ${otp}`);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, devMode: true, code: otp }));
      return;
    }

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: cleanEmail,
          to_name: userName || 'User',
          otp_code: otp,
          expiry_minutes: '5',
        },
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      throw new Error(`EmailJS REST API error: ${emailResponse.status} - ${errText}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error('[send-otp] Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}
