const { AnatomicalMarking, ClinicalNote, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

// Initialize default views structure
const initMarkingsStructure = () => ({
  anterior: [],
  posterior: [],
  lateral_left: [],
  lateral_right: [],
  skeletal: []
});

// GET all markings for a clinical note (MySQL version)
exports.getAllMarkings = async (req, res) => {
  try {
    const { clinicalNoteId } = req.params;

    // Verify clinical note exists
    const [noteExists] = await sequelize.query(
      'SELECT EXISTS(SELECT 1 FROM ClinicalNotes WHERE id = ?) AS exists_check',
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT
      }
    );

    if (!noteExists.exists_check) {
      return res.status(404).json({ message: 'Clinical note not found' });
    }

    // Permission check
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      const [hasPermission] = await sequelize.query(
        `SELECT 1 FROM ClinicalNotes 
         WHERE id = ? AND therapistId = ?`,
        {
          replacements: [clinicalNoteId, req.user.id],
          type: QueryTypes.SELECT
        }
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Unauthorized access to note' });
      }
    }

    // Get all markings for the note
    const markings = await sequelize.query(
      `SELECT 
         id, x, y, view, type, description, notes,
         intensity, color, size, createdAt, updatedAt
       FROM AnatomicalMarkings
       WHERE clinicalNoteId = ?`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT
      }
    );

    // Group by view manually since MySQL doesn't have JSON_AGG in all versions
    const result = initMarkingsStructure();
    markings.forEach(marking => {
      if (result[marking.view]) {
        result[marking.view].push(marking);
      }
    });

    return res.status(200).json({ markings: result });

  } catch (error) {
    console.error('MySQL error getting markings:', error);
    return res.status(500).json({ message: 'Failed to get markings' });
  }
};

// CREATE a new marking (MySQL version)
exports.createMarking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clinicalNoteId } = req.params;
    const { x, y, view, type, description, notes, intensity, color, size } = req.body;

    // Validate required fields
    if (!x || !y || !view || !type) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['x', 'y', 'view', 'type']
      });
    }

    // Generate ID
    const markingId = `${view}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Insert marking
    await sequelize.query(
      `INSERT INTO AnatomicalMarkings (
        id, clinicalNoteId, x, y, view, type, description, notes, 
        intensity, color, size, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [
          markingId,
          clinicalNoteId,
          x, y, view, type,
          description || null,
          notes || null,
          intensity || null,
          color || '#FF0000',
          size || 16
        ],
        type: QueryTypes.INSERT,
        transaction
      }
    );

    // Get the created marking
    const [marking] = await sequelize.query(
      `SELECT * FROM AnatomicalMarkings WHERE id = ?`,
      {
        replacements: [markingId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    await transaction.commit();
    return res.status(201).json({ marking });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error creating marking:', error);
    return res.status(500).json({ message: 'Failed to create marking' });
  }
};

// UPDATE a marking (MySQL version)
exports.updateMarking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = req.body;

    // Update marking
    await sequelize.query(
      `UPDATE AnatomicalMarkings 
       SET 
         x = COALESCE(?, x),
         y = COALESCE(?, y),
         type = COALESCE(?, type),
         description = COALESCE(?, description),
         notes = COALESCE(?, notes),
         intensity = COALESCE(?, intensity),
         color = COALESCE(?, color),
         size = COALESCE(?, size),
         updatedAt = NOW()
       WHERE id = ?`,
      {
        replacements: [
          updates.x || null,
          updates.y || null,
          updates.type || null,
          updates.description || null,
          updates.notes || null,
          updates.intensity || null,
          updates.color || null,
          updates.size || null,
          id
        ],
        type: QueryTypes.UPDATE,
        transaction
      }
    );

    // Get the updated marking
    const [updatedMarking] = await sequelize.query(
      `SELECT * FROM AnatomicalMarkings WHERE id = ?`,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!updatedMarking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Marking not found' });
    }

    await transaction.commit();
    return res.status(200).json({ marking: updatedMarking });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error updating marking:', error);
    return res.status(500).json({ message: 'Failed to update marking' });
  }
};

// DELETE a marking (MySQL version)
exports.deleteMarking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    // First get the marking to return its ID
    const [marking] = await sequelize.query(
      `SELECT id FROM AnatomicalMarkings WHERE id = ?`,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!marking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Marking not found' });
    }

    // Delete the marking
    await sequelize.query(
      `DELETE FROM AnatomicalMarkings WHERE id = ?`,
      {
        replacements: [id],
        type: QueryTypes.DELETE,
        transaction
      }
    );

    await transaction.commit();
    return res.status(200).json({ 
      message: 'Marking deleted successfully',
      deletedId: marking.id 
    });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error deleting marking:', error);
    return res.status(500).json({ message: 'Failed to delete marking' });
  }
};

// BULK UPDATE all markings (MySQL version)
exports.bulkUpdateMarkings = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clinicalNoteId } = req.params;
    const { markings: incomingMarkings } = req.body;

    // Convert grouped markings to flat array
    const incomingArray = Object.values(incomingMarkings).flat();

    // Process updates/inserts
    if (incomingArray.length > 0) {
      // MySQL doesn't support bulk upsert, so we do individual operations
      for (const marking of incomingArray) {
        // Check if marking exists
        const [existing] = await sequelize.query(
          `SELECT id FROM AnatomicalMarkings WHERE id = ?`,
          {
            replacements: [marking.id],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        if (existing) {
          // Update existing
          await sequelize.query(
            `UPDATE AnatomicalMarkings SET
              x = ?, y = ?, view = ?, type = ?,
              description = ?, notes = ?,
              intensity = ?, color = ?, size = ?,
              updatedAt = NOW()
             WHERE id = ?`,
            {
              replacements: [
                marking.x,
                marking.y,
                marking.view,
                marking.type,
                marking.description || null,
                marking.notes || null,
                marking.intensity || null,
                marking.color || '#FF0000',
                marking.size || 16,
                marking.id
              ],
              type: QueryTypes.UPDATE,
              transaction
            }
          );
        } else {
          // Insert new
          await sequelize.query(
            `INSERT INTO AnatomicalMarkings (
              id, clinicalNoteId, x, y, view, type,
              description, notes, intensity, color, size,
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                marking.id,
                clinicalNoteId,
                marking.x,
                marking.y,
                marking.view,
                marking.type,
                marking.description || null,
                marking.notes || null,
                marking.intensity || null,
                marking.color || '#FF0000',
                marking.size || 16
              ],
              type: QueryTypes.INSERT,
              transaction
            }
          );
        }
      }
    }

    // Get IDs to check for deletions
    const existingMarkings = await sequelize.query(
      `SELECT id FROM AnatomicalMarkings 
       WHERE clinicalNoteId = ?`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const existingIds = existingMarkings.map(row => row.id);
    const incomingIds = incomingArray.map(m => m.id);
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

    // Delete markings not in incoming array
    if (idsToDelete.length > 0) {
      await sequelize.query(
        `DELETE FROM AnatomicalMarkings 
         WHERE id IN (?)`,
        {
          replacements: [idsToDelete],
          transaction
        }
      );
    }

    // Get updated state
    const updatedMarkings = await sequelize.query(
      `SELECT * FROM AnatomicalMarkings
       WHERE clinicalNoteId = ?`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    // Group by view
    const result = initMarkingsStructure();
    updatedMarkings.forEach(marking => {
      if (result[marking.view]) {
        result[marking.view].push(marking);
      }
    });

    await transaction.commit();
    return res.status(200).json({ markings: result });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error bulk updating markings:', error);
    return res.status(500).json({ message: 'Failed to bulk update markings' });
  }
};