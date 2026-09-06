const ApplicationFrontend = require('../models/applicationFrontend');

exports.getFrontend = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const frontend = await ApplicationFrontend.getByApplicationId(applicationId);
        res.status(200).json({ frontend });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving frontend code' });
    }
};

exports.updateFrontend = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { html_content, css_content, js_content } = req.body;
        
        const updated = await ApplicationFrontend.upsert(applicationId, html_content || '', css_content || '', js_content || '');
        res.status(200).json({ message: 'Frontend updated successfully', frontend: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating frontend code' });
    }
};
