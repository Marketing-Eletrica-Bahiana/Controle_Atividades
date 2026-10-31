import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Exatamente assim, com maiúsculas e minúsculas: é o caminho do GitHub Pages.
  base: '/Controle_Atividades/',
  plugins: [react()],
})
