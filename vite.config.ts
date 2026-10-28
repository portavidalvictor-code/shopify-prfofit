import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// The app's Client ID (public) lets App Bridge show the sub-menu in the Shopify admin.
// Read from the same SHOPIFY_CLIENT_ID env var the API uses, so each deploy gets its own.
const shopifyApiKey = (): Plugin => ({
  name: 'shopify-api-key',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace('%SHOPIFY_API_KEY%', process.env.SHOPIFY_CLIENT_ID ?? ''),
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [shopifyApiKey(), react(), tailwindcss()],
})
