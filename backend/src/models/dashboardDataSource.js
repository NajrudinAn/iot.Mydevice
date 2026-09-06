const db = require('../config/db');

class DashboardDataSource {
    static async create(application_id, name, source_type, device_ids, api_definition_id, data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            // We still populate device_id with the first device for backward compatibility with older queries if needed,
            // or just leave it null if we are fully migrating. The migration set it to DROP NOT NULL.
            const firstDeviceId = (device_ids && device_ids.length > 0) ? device_ids[0] : null;

            const query = `
                INSERT INTO dashboard_data_sources (
                    application_id, name, source_type, device_id, api_definition_id, 
                    data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;
            const values = [
                application_id, name, source_type, firstDeviceId, api_definition_id || null,
                data_field, query_mode || 'LATEST', time_range || 'LAST_1_HOUR', aggregation || null,
                refresh_interval || 30, enabled !== undefined ? enabled : true, configuration || {}
            ];
            const res = await client.query(query, values);
            const source = res.rows[0];

            if (device_ids && device_ids.length > 0) {
                for (const dId of device_ids) {
                    await client.query(
                        `INSERT INTO dashboard_data_source_devices (source_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [source.id, dId]
                    );
                }
            }

            await client.query('COMMIT');
            return source;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async findAll(application_id) {
        // Aggregate devices into a JSON array for easy frontend consumption
        const query = `
            SELECT dds.*, 
                   ad.name as api_name,
                   (
                       SELECT json_agg(json_build_object('id', d.id, 'name', d.name, 'hardware_device_id', d.device_id))
                       FROM dashboard_data_source_devices ddsd
                       JOIN devices d ON d.id = ddsd.device_id
                       WHERE ddsd.source_id = dds.id
                   ) as devices
            FROM dashboard_data_sources dds
            LEFT JOIN api_definitions ad ON dds.api_definition_id = ad.id
            WHERE dds.application_id = $1
            ORDER BY dds.created_at DESC
        `;
        const res = await db.query(query, [application_id]);
        return res.rows.map(row => {
            row.devices = row.devices || [];
            // For backward compatibility, also expose device_name if there is only 1 device
            if (row.devices.length > 0) {
                row.device_name = row.devices[0].name;
                row.device_id = row.devices[0].id;
            }
            return row;
        });
    }

    static async findById(id) {
        const query = `
            SELECT dds.*, 
                   ad.name as api_name,
                   (
                       SELECT json_agg(json_build_object('id', d.id, 'name', d.name, 'hardware_device_id', d.device_id))
                       FROM dashboard_data_source_devices ddsd
                       JOIN devices d ON d.id = ddsd.device_id
                       WHERE ddsd.source_id = dds.id
                   ) as devices
            FROM dashboard_data_sources dds
            LEFT JOIN api_definitions ad ON dds.api_definition_id = ad.id
            WHERE dds.id = $1
        `;
        const res = await db.query(query, [id]);
        const row = res.rows[0];
        if (row) {
            row.devices = row.devices || [];
            if (row.devices.length > 0) {
                row.hardware_device_id = row.devices[0].hardware_device_id;
                row.device_id = row.devices[0].id;
            }
        }
        return row;
    }

    static async update(id, name, source_type, device_ids, api_definition_id, data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const firstDeviceId = (device_ids && device_ids.length > 0) ? device_ids[0] : null;

            const query = `
                UPDATE dashboard_data_sources
                SET name = $2, source_type = $3, device_id = $4, api_definition_id = $5,
                    data_field = $6, query_mode = $7, time_range = $8, aggregation = $9,
                    refresh_interval = $10, enabled = $11, configuration = $12, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            const values = [
                id, name, source_type, firstDeviceId, api_definition_id || null,
                data_field, query_mode, time_range, aggregation || null,
                refresh_interval, enabled, configuration || {}
            ];
            const res = await client.query(query, values);
            const source = res.rows[0];

            if (source) {
                // Replace associated devices
                await client.query(`DELETE FROM dashboard_data_source_devices WHERE source_id = $1`, [id]);
                if (device_ids && device_ids.length > 0) {
                    for (const dId of device_ids) {
                        await client.query(
                            `INSERT INTO dashboard_data_source_devices (source_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [source.id, dId]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return source;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async delete(id) {
        await db.query(`DELETE FROM dashboard_data_sources WHERE id = $1`, [id]);
    }
}

module.exports = DashboardDataSource;
