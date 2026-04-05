import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import simulateRouter  from './routes/simulate'
import healthRouter    from './routes/health'
import passkeysRouter  from './routes/passkeys'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/v1/simulate', simulateRouter)
app.use('/api/v1/health',   healthRouter)
app.use('/api/v1/passkey',  passkeysRouter)

const port = process.env.PORT ?? 3001
app.listen(port, () => {
  console.log(`InkSec API running on port ${port}`)
})

export { app }
