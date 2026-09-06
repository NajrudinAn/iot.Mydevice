const ApplicationDomain = require('../models/applicationDomain');
const DomainVerificationService = require('../services/domainVerificationService');

exports.listDomains = async (req, res) => {
    try {
        const domains = await ApplicationDomain.findByApplicationId(req.params.id);
        res.json({ domains });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list domains" });
    }
};

exports.getDomain = async (req, res) => {
    try {
        const domain = await ApplicationDomain.findById(req.params.domain_id);
        if (!domain || domain.application_id !== req.params.id) {
            return res.status(404).json({ error: "Domain not found" });
        }
        res.json({ domain });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get domain" });
    }
};

exports.addDomain = async (req, res) => {
    try {
        const { hostname, type } = req.body;
        if (!hostname || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Prevent platform reserved hostnames (simplified check)
        const reservedHosts = ['www', 'api', 'admin', 'app', 'dashboard', 'localhost'];
        const normalizedHost = hostname.toLowerCase().replace(/^(https?:\/\/)?/, '').split('/')[0];
        if (reservedHosts.includes(normalizedHost.split('.')[0])) {
            return res.status(400).json({ error: "Hostname is reserved by platform" });
        }

        try {
            const newDomain = await ApplicationDomain.create({
                application_id: req.params.id,
                hostname,
                type
            });

            // Auto-generate verification token for CUSTOM_DOMAIN
            if (type === 'CUSTOM_DOMAIN') {
                const token = DomainVerificationService.generateVerificationToken();
                const updated = await ApplicationDomain.updateStatus(newDomain.id, 'PENDING', token);
                return res.status(201).json({ domain: updated });
            }

            // Platform domains can be auto-active (for this phase logic)
            if (type === 'PLATFORM_SUBDOMAIN') {
                const updated = await ApplicationDomain.updateStatus(newDomain.id, 'ACTIVE');
                return res.status(201).json({ domain: updated });
            }

            res.status(201).json({ domain: newDomain });
        } catch (e) {
            if (e.code === '23505') { // unique violation
                return res.status(400).json({ error: "Hostname is already registered" });
            }
            throw e;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add domain" });
    }
};

exports.verifyDomain = async (req, res) => {
    try {
        const domain = await ApplicationDomain.findById(req.params.domain_id);
        if (!domain || domain.application_id !== req.params.id) {
            return res.status(404).json({ error: "Domain not found" });
        }

        if (domain.status === 'ACTIVE' || domain.status === 'VERIFIED') {
            return res.status(400).json({ error: "Domain is already verified" });
        }

        const isVerified = await DomainVerificationService.verifyDomain(domain.hostname, domain.verification_token);
        
        if (isVerified) {
            // Upgrade to ACTIVE immediately for local usage (or VERIFIED if we wanted an intermediate step)
            const updated = await ApplicationDomain.updateStatus(domain.id, 'ACTIVE', domain.verification_token, new Date());
            return res.json({ domain: updated });
        } else {
            return res.status(400).json({ error: "Domain verification failed. DNS record not found." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to verify domain" });
    }
};

exports.updateDomain = async (req, res) => {
    try {
        const domain = await ApplicationDomain.findById(req.params.domain_id);
        if (!domain || domain.application_id !== req.params.id) {
            return res.status(404).json({ error: "Domain not found" });
        }

        // Only handle is_primary for now
        const { is_primary, status } = req.body;

        let updated = domain;

        if (is_primary === true) {
            if (domain.status !== 'ACTIVE') {
                return res.status(400).json({ error: "Only active domains can be primary" });
            }
            updated = await ApplicationDomain.setPrimary(req.params.id, domain.id);
        }
        
        if (status && status === 'DISABLED') {
            updated = await ApplicationDomain.updateStatus(domain.id, 'DISABLED');
        } else if (status && status === 'ACTIVE' && domain.status === 'DISABLED' && domain.verified_at) {
            updated = await ApplicationDomain.updateStatus(domain.id, 'ACTIVE');
        }

        res.json({ domain: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to update domain" });
    }
};

exports.deleteDomain = async (req, res) => {
    try {
        const domain = await ApplicationDomain.findById(req.params.domain_id);
        if (!domain || domain.application_id !== req.params.id) {
            return res.status(404).json({ error: "Domain not found" });
        }

        await ApplicationDomain.delete(domain.id);
        res.json({ message: "Domain deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete domain" });
    }
};
