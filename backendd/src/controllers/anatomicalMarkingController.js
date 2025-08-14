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

    // FIXED: Updated permission check - therapists can view notes assigned to them
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      // For therapists, check if the note is assigned to them (regardless of who created it)
      const [hasPermission] = await sequelize.query(
        `SELECT 1 FROM ClinicalNotes cn
         JOIN Therapists t ON cn.therapistId = t.id
         WHERE cn.id = ? AND t.userId = ?`,
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
       WHERE clinicalNoteId = ?
       ORDER BY view, createdAt`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT
      }
    );

    console.log(`Found ${markings.length} markings for note ${clinicalNoteId}`);

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


// CREATE a new marking
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

// OPTIMIZED BULK UPDATE all markings (MySQL version with TRUE bulk operations)
exports.bulkUpdateMarkings = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clinicalNoteId } = req.params;
    const { markings: incomingMarkings } = req.body;

    console.log('Starting bulk update for clinical note:', clinicalNoteId);
    console.log('Incoming markings structure:', Object.keys(incomingMarkings));

    // Convert grouped markings to flat array
    const incomingArray = Object.values(incomingMarkings).flat();
    console.log('Total markings to process:', incomingArray.length);

    // Get existing markings first
    const existingMarkings = await sequelize.query(
      `SELECT id FROM AnatomicalMarkings WHERE clinicalNoteId = ?`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const existingIds = existingMarkings.map(row => row.id);
    const incomingIds = incomingArray.map(m => m.id);
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

    console.log('Existing IDs:', existingIds.length);
    console.log('Incoming IDs:', incomingIds.length);
    console.log('IDs to delete:', idsToDelete.length);

    // Delete markings not in incoming array (in bulk)
    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => '?').join(',');
      await sequelize.query(
        `DELETE FROM AnatomicalMarkings WHERE id IN (${placeholders})`,
        {
          replacements: idsToDelete,
          type: QueryTypes.DELETE,
          transaction
        }
      );
      console.log('Deleted markings:', idsToDelete.length);
    }

    // Process updates and inserts in true bulk
    if (incomingArray.length > 0) {
      // Separate existing and new markings
      const existingToUpdate = incomingArray.filter(m => existingIds.includes(m.id));
      const newToInsert = incomingArray.filter(m => !existingIds.includes(m.id));

      console.log('Markings to update:', existingToUpdate.length);
      console.log('Markings to insert:', newToInsert.length);

      // Bulk insert new markings
      if (newToInsert.length > 0) {
        const insertValues = newToInsert.map(marking => 
          `('${marking.id}', '${clinicalNoteId}', ${marking.x}, ${marking.y}, '${marking.view}', '${marking.type}', ${marking.description ? `'${marking.description.replace(/'/g, "''")}'` : 'NULL'}, ${marking.notes ? `'${marking.notes.replace(/'/g, "''")}'` : 'NULL'}, ${marking.intensity || 'NULL'}, '${marking.color || '#FF0000'}', ${marking.size || 16}, NOW(), NOW())`
        ).join(',');

        await sequelize.query(
          `INSERT INTO AnatomicalMarkings (
            id, clinicalNoteId, x, y, view, type, description, notes, 
            intensity, color, size, createdAt, updatedAt
          ) VALUES ${insertValues}`,
          {
            type: QueryTypes.INSERT,
            transaction
          }
        );
        console.log('Bulk inserted markings:', newToInsert.length);
      }

      // Bulk update existing markings
      if (existingToUpdate.length > 0) {
        for (const marking of existingToUpdate) {
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
        }
        console.log('Updated markings:', existingToUpdate.length);
      }
    }

    // Get updated state with optimized query
    const updatedMarkings = await sequelize.query(
      `SELECT * FROM AnatomicalMarkings WHERE clinicalNoteId = ? ORDER BY view, createdAt`,
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
    console.log('Bulk update completed successfully');

    return res.status(200).json({ 
      markings: result,
      summary: {
        totalProcessed: incomingArray.length,
        deleted: idsToDelete.length,
        updated: existingToUpdate?.length || 0,
        inserted: newToInsert?.length || 0
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error bulk updating markings:', error);
    return res.status(500).json({ 
      message: 'Failed to bulk update markings',
      error: error.message 
    });
  }
};

// NEW: Bulk sync endpoint for complete replacement
exports.bulkSyncMarkings = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clinicalNoteId } = req.params;
    const { markings: incomingMarkings } = req.body;

    console.log('Starting bulk sync for clinical note:', clinicalNoteId);

    // Verify clinical note exists and user has permission
    const [noteExists] = await sequelize.query(
      'SELECT EXISTS(SELECT 1 FROM ClinicalNotes WHERE id = ?) AS exists_check',
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (!noteExists.exists_check) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Clinical note not found' });
    }

    // Permission check
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      const [hasPermission] = await sequelize.query(
        `SELECT 1 FROM ClinicalNotes 
         WHERE id = ? AND therapistId = ?`,
        {
          replacements: [clinicalNoteId, req.user.id],
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (!hasPermission) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Unauthorized access to note' });
      }
    }

    // Delete all existing markings for this clinical note
    await sequelize.query(
      `DELETE FROM AnatomicalMarkings WHERE clinicalNoteId = ?`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.DELETE,
        transaction
      }
    );

    // Insert all new markings
    const incomingArray = Object.values(incomingMarkings).flat();
    
    if (incomingArray.length > 0) {
      const insertValues = incomingArray.map(marking => 
        `('${marking.id}', '${clinicalNoteId}', ${marking.x}, ${marking.y}, '${marking.view}', '${marking.type}', ${marking.description ? `'${marking.description.replace(/'/g, "''")}'` : 'NULL'}, ${marking.notes ? `'${marking.notes.replace(/'/g, "''")}'` : 'NULL'}, ${marking.intensity || 'NULL'}, '${marking.color || '#FF0000'}', ${marking.size || 16}, NOW(), NOW())`
      ).join(',');

      await sequelize.query(
        `INSERT INTO AnatomicalMarkings (
          id, clinicalNoteId, x, y, view, type, description, notes, 
          intensity, color, size, createdAt, updatedAt
        ) VALUES ${insertValues}`,
        {
          type: QueryTypes.INSERT,
          transaction
        }
      );
    }

    // Get the final state
    const finalMarkings = await sequelize.query(
      `SELECT * FROM AnatomicalMarkings WHERE clinicalNoteId = ? ORDER BY view, createdAt`,
      {
        replacements: [clinicalNoteId],
        type: QueryTypes.SELECT,
        transaction
      }
    );

    // Group by view
    const result = initMarkingsStructure();
    finalMarkings.forEach(marking => {
      if (result[marking.view]) {
        result[marking.view].push(marking);
      }
    });

    await transaction.commit();
    console.log('Bulk sync completed successfully');

    return res.status(200).json({ 
      success: true,
      markings: result,
      summary: {
        totalSynced: incomingArray.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('MySQL error bulk syncing markings:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to sync markings',
      error: error.message 
    });
  }
};