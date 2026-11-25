const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'contactSena',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

const checkDatabase = async () => {
    const connection = await pool.getConnection();
    connection.release();
};

const ensureOperationalSchema = async () => {
    const [caseColumns] = await pool.query(
        "SELECT COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'caso'"
    );
    const existingCaseColumns = new Set(caseColumns.map(column => String(column.columnName).toLowerCase()));
    if (!existingCaseColumns.has('fecsegcas')) await pool.query('ALTER TABLE caso ADD COLUMN fecSegCas DATETIME NULL');
    if (!existingCaseColumns.has('cercas')) await pool.query('ALTER TABLE caso ADD COLUMN cerCas BOOLEAN NOT NULL DEFAULT FALSE');
    if (existingCaseColumns.has('comintcas')) await pool.query('ALTER TABLE caso DROP COLUMN comIntCas');
    for (const { table, pauseColumn } of [
        { table: 'registroSupervisor', pauseColumn: 'tiempoPausaRegSup' },
        { table: 'registroAgente', pauseColumn: 'tiempoPausaRegAge' }
    ]) {
        const [columns] = await pool.query(
            'SELECT COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
            [table]
        );
        const existing = new Set(columns.map(column => String(column.columnName).toLowerCase()));
        const hasPauseColumn = existing.has(pauseColumn.toLowerCase());
        const hasLegacyPause = existing.has('tiempopausa');
        const hasLegacyStart = existing.has('iniciopausa');
        if (!hasPauseColumn) {
            try {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${pauseColumn} TIME NOT NULL DEFAULT '00:00:00'`);
            } catch (error) {
                // Another startup may have added it after our information_schema check.
                if (error.code !== 'ER_DUP_FIELDNAME') throw error;
            }
            if (hasLegacyPause) {
                await pool.query(`UPDATE ${table} SET ${pauseColumn} = COALESCE(tiempoPausa, '00:00:00')`);
            }
        }
        if (hasLegacyPause) await pool.query(`ALTER TABLE ${table} DROP COLUMN tiempoPausa`);
        if (hasLegacyStart) await pool.query(`ALTER TABLE ${table} DROP COLUMN inicioPausa`);
    }
    await pool.query("UPDATE estadoCaso SET nomEstCas = CASE idEstCas WHEN 1 THEN 'Efectivo' WHEN 2 THEN 'En proceso' WHEN 3 THEN 'Sin gestión' ELSE nomEstCas END WHERE idEstCas IN (1, 2, 3)");
    await pool.query("UPDATE canalContacto SET nomCanInt = 'Llamada' WHERE idCanInt = 1");
    const [campaigns] = await pool.query('SELECT codCam FROM campana');
    const defaults = ['Volver a llamar', 'Contacto efectivo', 'Buzón de mensajes', 'Número equivocado'];
    const legacy = new Set(['Contacto efectivo - Venta Cerrada', 'No contesta - Reintentar', 'Contesto - Interesado', 'Contesto - No Interesado', 'Agendado / Agendar Rellamada', 'Tercero / No Titular', 'No Contesta', 'Ocupado', 'Buzón de Voz', 'Número Equivocado', 'Llamada Cortada']);
    for (const campaign of campaigns) {
        const [tipifications] = await pool.query('SELECT nomTip FROM tipificacion WHERE codCamTip = ?', [campaign.codCam]);
        if (tipifications.length && tipifications.every(item => legacy.has(item.nomTip))) {
            const [tipificationRows] = await pool.query('SELECT codTip, nomTip FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaign.codCam]);
            for (let index = 0; index < Math.min(tipificationRows.length, defaults.length); index += 1) {
                await pool.query('UPDATE tipificacion SET nomTip = ? WHERE codTip = ?', [defaults[index], tipificationRows[index].codTip]);
            }
            const existing = new Set(tipificationRows.slice(0, defaults.length).map((_, index) => defaults[index]));
            for (const name of defaults.filter(item => !existing.has(item))) await pool.query('INSERT INTO tipificacion (codCamTip, nomTip) VALUES (?, ?)', [campaign.codCam, name]);
        }
    }
    const [columns] = await pool.query("SELECT data_type AS type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'campana' AND column_name = 'estadoCam'");
    if (!columns.length) {
        await pool.query('ALTER TABLE campana ADD COLUMN estadoCam BOOLEAN NOT NULL DEFAULT TRUE');
    } else if (columns[0].type !== 'tinyint') {
        await pool.query("UPDATE campana SET estadoCam = CASE WHEN estadoCam = 'Pausada' THEN 0 ELSE 1 END");
        await pool.query('ALTER TABLE campana MODIFY COLUMN estadoCam BOOLEAN NOT NULL DEFAULT TRUE');
    }
    const [clientDocument] = await pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'baseDatosCliente' AND column_name = 'idCli'");
    if (clientDocument[0]?.is_nullable === 'NO') await pool.query('ALTER TABLE baseDatosCliente MODIFY COLUMN idCli varchar(11) NULL');
    const [clientDocumentType] = await pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'baseDatosCliente' AND column_name = 'idTipDoCli'");
    if (clientDocumentType[0]?.is_nullable === 'NO') await pool.query('ALTER TABLE baseDatosCliente MODIFY COLUMN idTipDoCli int NULL');
    const [uniqueClientDocuments] = await pool.query("SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'baseDatosCliente' AND column_name = 'idCli' AND non_unique = 0 AND index_name <> 'PRIMARY'");
    for (const index of uniqueClientDocuments) await pool.query(`ALTER TABLE baseDatosCliente DROP INDEX \`${index.index_name.replace(/`/g, '')}\``);
    await pool.query('ALTER TABLE agente MODIFY COLUMN conAge varchar(200) NOT NULL');
    await pool.query('ALTER TABLE supervisor MODIFY COLUMN conSup varchar(200) NOT NULL');
};

module.exports = { pool, checkDatabase, ensureOperationalSchema };
