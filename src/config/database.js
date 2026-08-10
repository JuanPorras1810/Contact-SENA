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
