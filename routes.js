import { Router } from 'express'

/**
 * Create the public Market Operations example router.
 *
 * @returns {import('express').Router} Example plugin router.
 */
export function createMarketOpsPublicRouter() {
    const router = Router()

    router.get('/', (_req, res) => {
        res.type('text/plain').send('Hello from the local Market Operations plugin.')
    })

    return router
}
