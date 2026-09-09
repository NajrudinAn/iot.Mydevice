const request = require('supertest');
const express = require('express');
const applicationRoutes = require('../src/routes/applications');
const { validateSlug, generateSafeSlug, RESERVED_SLUGS } = require('../src/utils/slugValidator');
const Application = require('../src/models/application');
const Workspace = require('../src/models/workspace');
const db = require('../src/config/db');

describe('Slug Validator', () => {
    test('generateSafeSlug normalizes names correctly', () => {
        expect(generateSafeSlug('My Application')).toBe('my-application');
        expect(generateSafeSlug('Smart-Home_123')).toBe('smart-home-123');
        expect(generateSafeSlug('--Test--App--')).toBe('test-app');
    });

    test('validateSlug rejects invalid formats', () => {
        expect(validateSlug('a').valid).toBe(false); // too short
        expect(validateSlug('app_name').valid).toBe(false); // underscores
        expect(validateSlug('-app').valid).toBe(false); // leading hyphen
        expect(validateSlug('app-').valid).toBe(false); // trailing hyphen
        expect(validateSlug('a b').valid).toBe(false); // spaces
        expect(validateSlug('a'.repeat(64)).valid).toBe(false); // too long
    });

    test('validateSlug rejects reserved words', () => {
        expect(validateSlug('www').valid).toBe(false);
        expect(validateSlug('API').valid).toBe(false);
        expect(validateSlug('Admin').valid).toBe(false);
        expect(validateSlug('platform').valid).toBe(false);
        expect(validateSlug('mqtt').valid).toBe(false);
    });

    test('validateSlug allows valid slugs', () => {
        expect(validateSlug('app-1').valid).toBe(true);
        expect(validateSlug('smart-home').valid).toBe(true);
        expect(validateSlug('a1').valid).toBe(true);
    });
});

describe('Slug Concurrency & DB Integrity', () => {
    let workspaceId;
    let userId = '00000000-0000-0000-0000-000000000000'; // mock uuid

    beforeAll(async () => {
        // Setup mock user and workspace for real DB concurrency test
        await db.query(`INSERT INTO users (id, name, email, password_hash) VALUES ($1, 'Test', 'test@test.com', 'hash') ON CONFLICT (id) DO NOTHING`, [userId]);
        const res = await db.query(`INSERT INTO workspaces (name, owner_id) VALUES ('Test WS', $1) RETURNING id`, [userId]);
        workspaceId = res.rows[0].id;
    });

    afterAll(async () => {
        await db.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]);
        await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
        await db.pool.end();
    });

    test('Concurrent create requests for same slug should result in only one success', async () => {
        const testSlug = 'concurrency-test-app';

        // Ensure clean state
        await db.query(`DELETE FROM applications WHERE slug = $1`, [testSlug]);

        // We simulate concurrency by calling the model directly to avoid full Express auth setup overhead in tests
        const p1 = Application.create(workspaceId, 'App 1', testSlug, 'Desc', userId, null, 'DEVELOPMENT', false);
        const p2 = Application.create(workspaceId, 'App 2', testSlug, 'Desc', userId, null, 'DEVELOPMENT', false);

        const results = await Promise.allSettled([p1, p2]);

        const successes = results.filter(r => r.status === 'fulfilled');
        const rejections = results.filter(r => r.status === 'rejected');

        expect(successes.length).toBe(1);
        expect(rejections.length).toBe(1);

        // Verify the database correctly threw a unique constraint error (23505)
        expect(rejections[0].reason.code).toBe('23505');

        // Cleanup
        await db.query(`DELETE FROM applications WHERE slug = $1`, [testSlug]);
    });
});
