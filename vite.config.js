import fs from 'node:fs'
import path from 'node:path'

function listRecords(directory) {
  const files = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }) : []
  return files.filter(file => file.isFile() && /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name))
    .map((file, index) => {
      const name = file.name.replace(/\.[^.]+$/, '')
      const parts = name.split(' - ')
      return {
        artist: parts.length > 1 ? parts.shift() : 'Unknown artist',
        title: parts.join(' - ') || name,
        filename: file.name,
        url: '/audio/' + encodeURIComponent(file.name),
        color: ['#f4b752', '#b8db86', '#eaa5d1'][index % 3],
      }
    })
}

export default {
  plugins: [{
    name: 'audio-records',
    configureServer(server) {
      server.middlewares.use('/__audio-library', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(listRecords(path.resolve(server.config.root, 'public/audio'))))
      })
    },
    resolveId(id) {
      if (id === 'virtual:audio-records') return '\0virtual:audio-records'
    },
    load(id) {
      if (id === '\0virtual:audio-records') return `export default ${JSON.stringify(listRecords(path.resolve('public/audio')))}`
    },
  }],
}
