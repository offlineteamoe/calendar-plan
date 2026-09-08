import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativo ("./") a propósito: así el build funciona sin cambios sin
// importar bajo qué nombre de repo/subcarpeta de GitHub Pages termine
// publicado, o si el proyecto se mueve de ubicación.
export default defineConfig({
  base: './',
  plugins: [react()],
})
