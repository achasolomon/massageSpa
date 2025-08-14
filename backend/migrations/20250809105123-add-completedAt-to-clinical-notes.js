'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1) Add column
      await queryInterface.addColumn(
        'ClinicalNotes',            // <-- confirm this exact table name
        'completedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      // 2) Add index
      await queryInterface.addIndex(
        'ClinicalNotes',
        ['completedAt'],
        {
          name: 'idx_clinical_notes_completed_at',
          transaction
        }
      );

      // 3) Optionally populate existing completed rows
      await queryInterface.sequelize.query(
        `UPDATE ClinicalNotes
         SET completedAt = updatedAt
         WHERE completed = TRUE AND completedAt IS NULL`,
        { transaction }
      );
    });
  },

  async down(queryInterface /* , Sequelize */) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('ClinicalNotes', 'idx_clinical_notes_completed_at', { transaction });
      await queryInterface.removeColumn('ClinicalNotes', 'completedAt', { transaction });
    });
  }
};
