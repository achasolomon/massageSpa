'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {

      // 1. Add sessionStatus ENUM column
      await queryInterface.addColumn(
        'Bookings',
        'sessionStatus',
        {
          type: Sequelize.ENUM(
            'scheduled',
            'in-progress',
            'completed',
            'no-show',
            'cancelled',
            'rescheduled'
          ),
          allowNull: false,
          defaultValue: 'scheduled'
        },
        { transaction }
      );

      // 2. Add no-show related fields
      await queryInterface.addColumn(
        'Bookings',
        'noShowReason',
        { type: Sequelize.TEXT, allowNull: true },
        { transaction }
      );

      await queryInterface.addColumn(
        'Bookings',
        'noShowMarkedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );

      await queryInterface.addColumn(
        'Bookings',
        'noShowMarkedBy',
        { type: Sequelize.UUID, allowNull: true },
        { transaction }
      );

      // 3. Add foreign key for noShowMarkedBy
      await queryInterface.addConstraint('Bookings', {
        fields: ['noShowMarkedBy'],
        type: 'foreign key',
        name: 'fk_bookings_no_show_marked_by',
        references: {
          table: 'Users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        transaction
      });

      // 4. Add indexes
      await queryInterface.addIndex(
        'Bookings',
        ['sessionStatus'],
        { name: 'idx_bookings_session_status', transaction }
      );

      await queryInterface.addIndex(
        'Bookings',
        ['noShowMarkedAt'],
        { name: 'idx_bookings_no_show_marked_at', transaction }
      );

      // 5. Update existing bookings based on clinical notes
      await queryInterface.sequelize.query(
        `
        UPDATE Bookings b
        INNER JOIN ClinicalNotes cn ON b.id = cn.bookingId
        SET b.sessionStatus = CASE 
            WHEN cn.completed = 1 THEN 'completed'
            ELSE 'in-progress'
        END
        WHERE b.sessionStatus = 'scheduled';
        `,
        { transaction }
      );

      // 6. Create the optional view
      await queryInterface.sequelize.query(
        `
        CREATE VIEW SessionsNeedingAttention AS
        SELECT 
            b.*,
            CASE 
                WHEN b.sessionStatus = 'scheduled' AND b.bookingStartTime < NOW() THEN 'overdue'
                WHEN b.sessionStatus = 'in-progress' AND b.bookingStartTime < DATE_SUB(NOW(), INTERVAL 2 HOUR) THEN 'overdue_in_progress'
                ELSE b.sessionStatus
            END as attention_type,
            TIMESTAMPDIFF(HOUR, b.bookingStartTime, NOW()) as hours_past_due
        FROM Bookings b
        WHERE (
            (b.sessionStatus = 'scheduled' AND b.bookingStartTime < NOW()) OR
            (b.sessionStatus = 'in-progress' AND b.bookingStartTime < DATE_SUB(NOW(), INTERVAL 2 HOUR))
        );
        `,
        { transaction }
      );

    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Drop the view first
      await queryInterface.sequelize.query(
        'DROP VIEW IF EXISTS SessionsNeedingAttention;',
        { transaction }
      );

      // Remove indexes
      await queryInterface.removeIndex('Bookings', 'idx_bookings_session_status', { transaction });
      await queryInterface.removeIndex('Bookings', 'idx_bookings_no_show_marked_at', { transaction });

      // Remove foreign key
      await queryInterface.removeConstraint('Bookings', 'fk_bookings_no_show_marked_by', { transaction });

      // Remove columns
      await queryInterface.removeColumn('Bookings', 'noShowReason', { transaction });
      await queryInterface.removeColumn('Bookings', 'noShowMarkedAt', { transaction });
      await queryInterface.removeColumn('Bookings', 'noShowMarkedBy', { transaction });

      // Remove ENUM
      await queryInterface.removeColumn('Bookings', 'sessionStatus', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Bookings_sessionStatus";', { transaction }); // PostgreSQL cleanup
    });
  }
};
