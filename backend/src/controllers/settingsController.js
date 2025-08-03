// controllers/settingsController.js

const Settings = require('../models/Settings');

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({
      where: { isActive: true },
      order: [['updatedAt', 'DESC']]
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'No settings found. Please configure your application settings.'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// Create or update settings
exports.updateSettings = async (req, res) => {
  try {
    const settingsData = req.body;

    // Check if settings already exist
    let settings = await Settings.findOne({
      where: { isActive: true }
    });

    if (settings) {
      // Update existing settings
      await settings.update(settingsData);
    } else {
      // Ensure no other active settings exist before creating new one
      await Settings.update(
        { isActive: false },
        { where: { isActive: true } }
      );
      
      // Create new settings
      settings = await Settings.create({
        ...settingsData,
        isActive: true
      });
    }

    res.json({
      success: true,
      message: settings.id ? 'Settings updated successfully' : 'Settings created successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// Delete settings (set isActive to false)
exports.deleteSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'No active settings found'
      });
    }

    await settings.update({ isActive: false });

    res.json({
      success: true,
      message: 'Settings deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete settings',
      error: error.message
    });
  }
};