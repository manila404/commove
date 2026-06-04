import { createClient } from '@sanity/client';
import { dataURLtoBlob } from './imageUtils';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;
const token = import.meta.env.VITE_SANITY_AUTH_TOKEN;

const assertSanityConfig = () => {
  if (!projectId || !dataset || !token) {
    throw new Error('Sanity is not configured. Set VITE_SANITY_PROJECT_ID, VITE_SANITY_DATASET, and VITE_SANITY_AUTH_TOKEN.');
  }
};

const getSanityClient = () => {
  assertSanityConfig();

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2026-06-04',
    useCdn: false,
  });
};

export const uploadEventImage = async (base64: string): Promise<string> => {
  const imageBlob = dataURLtoBlob(base64);
  const extension = imageBlob.type.split('/')[1] || 'jpg';
  const asset = await getSanityClient().assets.upload('image', imageBlob, {
    filename: `event-${Date.now()}.${extension}`,
  });

  if (!asset.url) {
    throw new Error('Sanity upload completed without returning an image URL.');
  }

  return asset.url;
};
