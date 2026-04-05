import express from 'express'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// ── In-memory stores (sufficient for demo) ────────────────────────────────────

interface StoredCredential {
  publicKeyCOSE: Uint8Array<ArrayBuffer> // used by verifyAuthenticationResponse
  publicKeySPKI: string                  // base64 SPKI — returned to ZeroDev SDK on login
  counter:       number
}

const regChallenges = new Map<string, string>()        // userId → challenge
const loginChallenges = new Map<string, string>()      // challenge → rpID
const credentials = new Map<string, StoredCredential>() // credentialId → cred

// ── POST /register/options ────────────────────────────────────────────────────

router.post('/register/options', async (req, res) => {
  try {
    const { username, rpID } = req.body as { username: string; rpID?: string }
    const effectiveRpId = rpID || new URL(req.headers.origin ?? 'http://localhost').hostname
    const userId = uuidv4()

    const options = await generateRegistrationOptions({
      rpName:   'InkSec Guard',
      rpID:     effectiveRpId,
      userID:   Buffer.from(userId),
      userName: username || 'user',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey:      'required',
        userVerification: 'required',
      },
    })

    regChallenges.set(userId, options.challenge)
    res.json({ options, userId })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── POST /register/verify ─────────────────────────────────────────────────────

router.post('/register/verify', async (req, res) => {
  try {
    const { userId, cred, rpID } = req.body as {
      userId:   string
      username: string
      cred:     RegistrationResponseJSON
      rpID?:    string
    }

    const expectedChallenge = regChallenges.get(userId)
    if (!expectedChallenge) {
      res.status(400).json({ error: 'Challenge expired or not found' })
      return
    }

    const effectiveRpId = rpID || new URL(req.headers.origin ?? 'http://localhost').hostname
    const origin = req.headers.origin ?? `https://${effectiveRpId}`

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response:          cred,
      expectedChallenge,
      expectedRPID:      effectiveRpId,
      expectedOrigin:    origin,
    })

    if (verified && registrationInfo) {
      const { credential } = registrationInfo
      credentials.set(cred.id, {
        publicKeyCOSE: new Uint8Array(credential.publicKey) as Uint8Array<ArrayBuffer>,
        publicKeySPKI: cred.response.publicKey ?? '',
        counter:       credential.counter,
      })
      regChallenges.delete(userId)
    }

    res.json({ verified })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── POST /login/options ───────────────────────────────────────────────────────

router.post('/login/options', async (req, res) => {
  try {
    const { rpID } = req.body as { rpID?: string }
    const effectiveRpId = rpID || new URL(req.headers.origin ?? 'http://localhost').hostname

    const options = await generateAuthenticationOptions({
      rpID:             effectiveRpId,
      userVerification: 'required',
    })

    loginChallenges.set(options.challenge, effectiveRpId)
    res.json(options)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── POST /login/verify ────────────────────────────────────────────────────────

router.post('/login/verify', async (req, res) => {
  try {
    const { cred, rpID } = req.body as { cred: AuthenticationResponseJSON; rpID?: string }

    const stored = credentials.get(cred.id)
    if (!stored) {
      res.status(400).json({ error: 'Credential not registered' })
      return
    }

    // Decode challenge from signed clientDataJSON
    const clientData = JSON.parse(
      Buffer.from(cred.response.clientDataJSON, 'base64').toString()
    ) as { challenge: string }

    const effectiveRpId = rpID || loginChallenges.get(clientData.challenge) ||
      new URL(req.headers.origin ?? 'http://localhost').hostname
    const origin = req.headers.origin ?? `https://${effectiveRpId}`

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response:          cred,
      expectedChallenge: clientData.challenge,
      expectedRPID:      effectiveRpId,
      expectedOrigin:    origin,
      credential: {
        id:        cred.id,
        publicKey: stored.publicKeyCOSE,
        counter:   stored.counter,
      },
    })

    if (verified) {
      stored.counter = authenticationInfo.newCounter
      loginChallenges.delete(clientData.challenge)
    }

    res.json({
      verification: { verified },
      pubkey:       stored.publicKeySPKI, // base64 SPKI — used by ZeroDev SDK
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
