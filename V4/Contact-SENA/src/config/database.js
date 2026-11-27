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

    const defaults = [
        { name: 'Contacto efectivo', statusId: 1 },
        { name: 'Volver a llamar', statusId: 2 },
        { name: 'Buzón de mensajes', statusId: 3 },
        { name: 'Número equivocado', statusId: 3 }
    ];
    const [tipificationColumns] = await pool.query(
        "SELECT COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tipificacion'"
    );
    const tipificationColumnNames = new Set(tipificationColumns.map(column => String(column.columnName).toLowerCase()));
    if (!tipificationColumnNames.has('idestcastip')) {
        await pool.query('ALTER TABLE tipificacion ADD COLUMN idEstCasTip int NULL');
        await pool.query(`UPDATE tipificacion SET idEstCasTip = CASE
            WHEN LOWER(nomTip) LIKE '%efectivo%' OR LOWER(nomTip) LIKE '%venta cerrada%' THEN 1
            WHEN LOWER(nomTip) LIKE '%volver%' OR LOWER(nomTip) LIKE '%reintentar%' OR LOWER(nomTip) LIKE '%agend%' OR LOWER(nomTip) LIKE '%interesado%' THEN 2
            ELSE 3 END`);
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS campanaTipificacion (
        codCamTip int auto_increment,
        codCam int NOT NULL,
        codTip int NOT NULL,
        primary key(codCamTip),
        unique key uqCampanaTipificacion (codCam, codTip),
        foreign key(codCam) references campana(codCam) on delete cascade,
        foreign key(codTip) references tipificacion(codTip) on delete cascade
    )`);
    const [campaignTipificationIndexRows] = await pool.query(`
        SELECT index_name AS indexName,
               GROUP_CONCAT(column_name ORDER BY seq_in_index) AS indexColumns
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'campanaTipificacion'
          AND non_unique = 0
        GROUP BY index_name
    `);
    const campaignTipificationIndexes = campaignTipificationIndexRows.filter(index =>
        index.indexName !== 'PRIMARY' && index.indexColumns === 'codCam,codTip'
    );
    const hasExpectedCampaignTipificationKey = campaignTipificationIndexes.some(index => index.indexName === 'uqCampanaTipificacion');
    if (!hasExpectedCampaignTipificationKey) {
        await pool.query(`DELETE duplicate FROM campanaTipificacion duplicate
            INNER JOIN campanaTipificacion canonical
                ON canonical.codCam = duplicate.codCam
                AND canonical.codTip = duplicate.codTip
                AND canonical.codCamTip < duplicate.codCamTip`);
        await pool.query('ALTER TABLE campanaTipificacion ADD UNIQUE KEY uqCampanaTipificacion (codCam, codTip)');
    }
    for (const index of campaignTipificationIndexes) {
        if (index.indexName === 'uqCampanaTipificacion') continue;
        await pool.query(`ALTER TABLE campanaTipificacion DROP INDEX \`${String(index.indexName).replace(/`/g, '')}\``);
    }

    if (tipificationColumnNames.has('codcamtip')) {
        const [legacyRows] = await pool.query('SELECT codTip, codCamTip, nomTip, idEstCasTip FROM tipificacion ORDER BY codTip');
        const canonical = new Map();
        for (const row of legacyRows) {
            const key = `${String(row.nomTip).trim().toLowerCase()}|${row.idEstCasTip}`;
            if (!canonical.has(key)) canonical.set(key, row);
        }
        for (const row of legacyRows) {
            const key = `${String(row.nomTip).trim().toLowerCase()}|${row.idEstCasTip}`;
            const master = canonical.get(key);
            await pool.query(`INSERT INTO campanaTipificacion (codCam, codTip)
                SELECT ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM campanaTipificacion WHERE codCam = ? AND codTip = ?
                )`, [row.codCamTip, master.codTip, row.codCamTip, master.codTip]);
            if (master.codTip !== row.codTip) {
                await pool.query('UPDATE interaccion SET codTipInt = ? WHERE codTipInt = ?', [master.codTip, row.codTip]);
                await pool.query('DELETE FROM tipificacion WHERE codTip = ?', [row.codTip]);
            }
        }
        const [tipificationForeignKeys] = await pool.query(
            "SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipificacion' AND COLUMN_NAME = 'codCamTip' AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        for (const foreignKey of tipificationForeignKeys) await pool.query(`ALTER TABLE tipificacion DROP FOREIGN KEY \`${String(foreignKey.name).replace(/`/g, '')}\``);
        await pool.query('ALTER TABLE tipificacion DROP COLUMN codCamTip');
    }
    await pool.query('UPDATE tipificacion SET idEstCasTip = 3 WHERE idEstCasTip IS NULL');
    const [tipificationStatusKeys] = await pool.query(
        "SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipificacion' AND COLUMN_NAME = 'idEstCasTip' AND REFERENCED_TABLE_NAME = 'estadoCaso'"
    );
    if (!tipificationStatusKeys.length) await pool.query('ALTER TABLE tipificacion MODIFY COLUMN idEstCasTip int NOT NULL, ADD CONSTRAINT fk_tipificacion_estado FOREIGN KEY (idEstCasTip) REFERENCES estadoCaso(idEstCas)');

    const [interactionColumns] = await pool.query(
        "SELECT COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'interaccion'"
    );
    if (interactionColumns.some(column => String(column.columnName).toLowerCase() === 'idestcasint')) {
        const [interactionForeignKeys] = await pool.query(
            "SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interaccion' AND COLUMN_NAME = 'idEstCasInt' AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        for (const foreignKey of interactionForeignKeys) await pool.query(`ALTER TABLE interaccion DROP FOREIGN KEY \`${String(foreignKey.name).replace(/`/g, '')}\``);
        await pool.query('ALTER TABLE interaccion DROP COLUMN idEstCasInt');
    }
    for (const defaultTipification of defaults) {
        await pool.query('INSERT INTO tipificacion (nomTip, idEstCasTip) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM tipificacion WHERE LOWER(nomTip) = LOWER(?) AND idEstCasTip = ?)', [defaultTipification.name, defaultTipification.statusId, defaultTipification.name, defaultTipification.statusId]);
    }
    const [campaigns] = await pool.query('SELECT codCam FROM campana');
    const [defaultTipifications] = await pool.query(
        'SELECT codTip FROM tipificacion WHERE LOWER(nomTip) IN (?, ?, ?, ?)',
        defaults.map(item => item.name.toLowerCase())
    );
    for (const campaign of campaigns) {
        const [[usage]] = await pool.query('SELECT COUNT(*) AS total FROM campanaTipificacion WHERE codCam = ?', [campaign.codCam]);
        if (Number(usage.total) > 0) continue;
        for (const tipification of defaultTipifications) {
            await pool.query(`INSERT INTO campanaTipificacion (codCam, codTip)
                SELECT ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM campanaTipificacion WHERE codCam = ? AND codTip = ?
                )`, [campaign.codCam, tipification.codTip, campaign.codCam, tipification.codTip]);
        }
    }
    const [campaignStatusColumn] = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'campana' AND column_name = 'estadoCam'"
    );
    if (campaignStatusColumn.length) await pool.query('ALTER TABLE campana DROP COLUMN estadoCam');
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
