import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';

// Define the media document type
const mediaType = {
  name: 'media',
  title: 'Media',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'uploadedAt',
      title: 'Uploaded At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    },
  ],
};

export default defineConfig({
  name: 'commove-admin',
  title: 'ComMove Sanity Admin',
  projectId: 'pneitbpk',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Sanity Admin')
          .items([
            S.listItem()
              .title('Media Library')
              .child(
                S.documentTypeList('media')
                  .title('Media Documents')
              ),
            S.listItem()
              .title('Raw Assets (Uploaded Images)')
              .child(
                S.documentList()
                  .title('Raw Assets')
                  .filter('_type == "sanity.imageAsset"')
                  .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
              ),
          ]),
    }),
    visionTool({
      defaultApiVersion: '2026-06-04',
      defaultDataset: 'production',
    }),
  ],
  schema: {
    types: [mediaType],
  },
});
