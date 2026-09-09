const request = require('supertest');
const express = require('express');
const hostedAppRoutes = require('../src/routes/hostedApp');
const Application = require('../src/models/application');
const fs = require('fs');
const path = require('path');

jest.mock('../src/models/application');
jest.mock('fs');
jest.mock('../src/config/db', () => ({
    pool: {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 'mock-deploy-123' }] })
    }
}));

const app = express();
// Simulate index.js mounting
app.use('/hosted', hostedAppRoutes);

describe('Nginx Wildcard URI Mapping -> Backend Routing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock a valid application
        Application.findBySlug.mockImplementation(async (slug) => {
            if (slug === 'valid-app') {
                return { id: 'app-id', workspace_id: 'ws-id', slug: 'valid-app' };
            }
            return null;
        });
        
        fs.existsSync.mockReturnValue(true);
        fs.lstatSync.mockReturnValue({ isFile: () => true });
        fs.readFileSync.mockReturnValue('<html><head></head><body>Hello</body></html>');
    });

    test('application1.mydevice.in/ -> /hosted/application1/ serves index.html', async () => {
        Application.findBySlug.mockResolvedValue({ id: 'app-id', workspace_id: 'ws-id', slug: 'valid-app' });

        const res = await request(app)
            .get('/hosted/valid-app/')
            .set('Host', 'mydevice.in'); // Simulate accessing via the main platform domain
        
        expect(Application.findBySlug).toHaveBeenCalledWith('valid-app');
        expect(res.status).toBe(200);
        expect(res.text).toContain('<base href="/hosted/valid-app/">');
        expect(res.text).toContain('Hello');
    });

    test('application1.mydevice.in/assets/app.js -> /hosted/application1/assets/app.js serves asset', async () => {
        // Nginx evaluates -> "/hosted/valid-app/assets/app.js"
        // We bypass sendFile in testing by mocking it if needed, but Supertest hits Express' sendFile.
        // We can just spy on res.sendFile or let it try to read from the mocked fs.
        // Express `res.sendFile` uses the real filesystem under the hood which is hard to mock securely.
        // We'll just verify it doesn't throw a 404 or traversal error, it will likely return a 500 or 404 since it tries to read the real disk in supertest.
        
        // Since `res.sendFile` uses real `fs.stat`, we mock the implementation of `res.sendFile` to observe it cleanly
        const mockSendFile = jest.fn(function(filePath, options, errCb) {
             // Simulate successful send to avoid hanging the request
             this.status(200).send('mock content');
        });
        
        const testApp = express();
        testApp.use((req, res, next) => {
            res.sendFile = mockSendFile;
            next();
        });
        testApp.use('/hosted', hostedAppRoutes);
        
        await request(testApp).get('/hosted/valid-app/assets/app.js');
        
        expect(mockSendFile).toHaveBeenCalled();
        expect(mockSendFile.mock.calls[0][0]).toBe('assets/app.js');
        expect(mockSendFile.mock.calls[0][1].root).toContain('mock-deploy-123'); // verified active deployment path
    });

    test('unknown-slug.mydevice.in/ -> /hosted/unknown-slug/ returns 404', async () => {
        const res = await request(app).get('/hosted/unknown-slug/');
        expect(res.status).toBe(404);
        expect(res.text).toBe('Application not found');
    });

    test('Protects against path traversal using URL encoded sequences', async () => {
        // Attack: application1.mydevice.in/%2e%2e%2f%2e%2e%2fetc%2fpasswd 
        // Nginx translates to: /hosted/valid-app/%2e%2e%2f%2e%2e%2fetc%2fpasswd
        // Express automatically decodes this to /hosted/valid-app/../../etc/passwd in req.params
        
        const res = await request(app).get('/hosted/valid-app/%2e%2e%2f%2e%2e%2fetc%2fpasswd');
        
        // The router should evaluate the path and reject it because the absolute path breaks out of appDir
        expect(res.status).toBe(403);
        expect(res.text).toBe('Forbidden');
    });
});
