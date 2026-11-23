-- Datos adicionales para probar búsquedas, asignaciones y registro de tiempos.
-- Ejecutar después de database/contactSena.sql:
-- mysql -u root -p < database/datosPrueba20.sql
USE contactSena;

INSERT IGNORE INTO agente
    (idAge, idTipDocAge, idBarAge, nomAge, emaAge, dirAge, telAge, telAltAge, conAge, fotAge)
VALUES
    ('0100', 1, 1, 'Andrés Torres', 'andres.torres@example.com', 'Calle 10', '3001000100', NULL, 'demo123', NULL),
    ('0101', 1, 2, 'Beatriz Sánchez', 'beatriz.sanchez@example.com', 'Calle 11', '3001000101', NULL, 'demo123', NULL),
    ('0102', 1, 1, 'Camilo Rojas', 'camilo.rojas@example.com', 'Calle 12', '3001000102', NULL, 'demo123', NULL),
    ('0103', 1, 2, 'Diana Castro', 'diana.castro@example.com', 'Calle 13', '3001000103', NULL, 'demo123', NULL),
    ('0104', 1, 1, 'Esteban Moreno', 'esteban.moreno@example.com', 'Calle 14', '3001000104', NULL, 'demo123', NULL),
    ('0105', 1, 2, 'Fernanda Ruiz', 'fernanda.ruiz@example.com', 'Calle 15', '3001000105', NULL, 'demo123', NULL),
    ('0106', 1, 1, 'Gabriel Vargas', 'gabriel.vargas@example.com', 'Calle 16', '3001000106', NULL, 'demo123', NULL),
    ('0107', 1, 2, 'Helena Martínez', 'helena.martinez@example.com', 'Calle 17', '3001000107', NULL, 'demo123', NULL),
    ('0108', 1, 1, 'Iván Herrera', 'ivan.herrera@example.com', 'Calle 18', '3001000108', NULL, 'demo123', NULL),
    ('0109', 1, 2, 'Juliana Pérez', 'juliana.perez@example.com', 'Calle 19', '3001000109', NULL, 'demo123', NULL),
    ('0110', 1, 1, 'Kevin Ramírez', 'kevin.ramirez@example.com', 'Calle 20', '3001000110', NULL, 'demo123', NULL),
    ('0111', 1, 2, 'Laura Gómez', 'laura.gomez@example.com', 'Calle 21', '3001000111', NULL, 'demo123', NULL),
    ('0112', 1, 1, 'Mateo Silva', 'mateo.silva@example.com', 'Calle 22', '3001000112', NULL, 'demo123', NULL),
    ('0113', 1, 2, 'Natalia León', 'natalia.leon@example.com', 'Calle 23', '3001000113', NULL, 'demo123', NULL),
    ('0114', 1, 1, 'Óscar Molina', 'oscar.molina@example.com', 'Calle 24', '3001000114', NULL, 'demo123', NULL),
    ('0115', 1, 2, 'Paula Cárdenas', 'paula.cardenas@example.com', 'Calle 25', '3001000115', NULL, 'demo123', NULL),
    ('0116', 1, 1, 'Ricardo Duarte', 'ricardo.duarte@example.com', 'Calle 26', '3001000116', NULL, 'demo123', NULL),
    ('0117', 1, 2, 'Sofía Navarro', 'sofia.navarro@example.com', 'Calle 27', '3001000117', NULL, 'demo123', NULL),
    ('0118', 1, 1, 'Tomás Pineda', 'tomas.pineda@example.com', 'Calle 28', '3001000118', NULL, 'demo123', NULL),
    ('0119', 1, 2, 'Valentina Ríos', 'valentina.rios@example.com', 'Calle 29', '3001000119', NULL, 'demo123', NULL);

INSERT INTO baseDatosAsesor (idAgeAse, codCamAse)
SELECT datos.idAge, datos.codCam
FROM (
    SELECT '0100' AS idAge, 1 AS codCam UNION ALL SELECT '0101', 2
    UNION ALL SELECT '0102', 1 UNION ALL SELECT '0103', 2
    UNION ALL SELECT '0104', 1 UNION ALL SELECT '0105', 2
    UNION ALL SELECT '0106', 1 UNION ALL SELECT '0107', 2
    UNION ALL SELECT '0108', 1 UNION ALL SELECT '0109', 2
    UNION ALL SELECT '0110', 1 UNION ALL SELECT '0111', 2
    UNION ALL SELECT '0112', 1 UNION ALL SELECT '0113', 2
    UNION ALL SELECT '0114', 1 UNION ALL SELECT '0115', 2
    UNION ALL SELECT '0116', 1 UNION ALL SELECT '0117', 2
    UNION ALL SELECT '0118', 1 UNION ALL SELECT '0119', 2
) AS datos
WHERE NOT EXISTS (
    SELECT 1 FROM baseDatosAsesor existente
    WHERE existente.idAgeAse = datos.idAge AND existente.codCamAse = datos.codCam
);

INSERT INTO registroAgente
    (idAgeRegAge, fecHoraIniRegAge, fecHoraCieRegAge, tieTotRegAge, tiempoPausaRegAge)
SELECT datos.idAge, datos.inicio, datos.cierre, datos.total, datos.pausa
FROM (
    SELECT '0100' AS idAge, '2026-11-01 08:00:00' AS inicio, '2026-11-01 17:00:00' AS cierre, '09:00:00' AS total, '00:15:00' AS pausa
    UNION ALL SELECT '0101', '2026-11-02 08:10:00', '2026-11-02 17:10:00', '09:00:00', '00:20:00'
    UNION ALL SELECT '0102', '2026-11-03 08:20:00', '2026-11-03 17:20:00', '09:00:00', '00:10:00'
    UNION ALL SELECT '0103', '2026-11-04 08:30:00', '2026-11-04 17:30:00', '09:00:00', '00:25:00'
    UNION ALL SELECT '0104', '2026-11-05 08:00:00', '2026-11-05 16:00:00', '08:00:00', '00:30:00'
    UNION ALL SELECT '0105', '2026-11-06 08:10:00', '2026-11-06 16:10:00', '08:00:00', '00:15:00'
    UNION ALL SELECT '0106', '2026-11-07 08:20:00', '2026-11-07 16:20:00', '08:00:00', '00:20:00'
    UNION ALL SELECT '0107', '2026-11-08 08:30:00', '2026-11-08 16:30:00', '08:00:00', '00:10:00'
    UNION ALL SELECT '0108', '2026-11-09 08:00:00', '2026-11-09 17:00:00', '09:00:00', '00:45:00'
    UNION ALL SELECT '0109', '2026-11-10 08:10:00', '2026-11-10 17:10:00', '09:00:00', '00:15:00'
    UNION ALL SELECT '0110', '2026-11-11 08:20:00', '2026-11-11 17:20:00', '09:00:00', '00:20:00'
    UNION ALL SELECT '0111', '2026-11-12 08:30:00', '2026-11-12 17:30:00', '09:00:00', '00:30:00'
    UNION ALL SELECT '0112', '2026-11-13 08:00:00', '2026-11-13 16:00:00', '08:00:00', '00:15:00'
    UNION ALL SELECT '0113', '2026-11-14 08:10:00', '2026-11-14 16:10:00', '08:00:00', '00:25:00'
    UNION ALL SELECT '0114', '2026-11-15 08:20:00', '2026-11-15 16:20:00', '08:00:00', '00:10:00'
    UNION ALL SELECT '0115', '2026-11-16 08:30:00', '2026-11-16 16:30:00', '08:00:00', '00:20:00'
    UNION ALL SELECT '0116', '2026-11-17 08:00:00', '2026-11-17 17:00:00', '09:00:00', '00:30:00'
    UNION ALL SELECT '0117', '2026-11-18 08:10:00', '2026-11-18 17:10:00', '09:00:00', '00:15:00'
    UNION ALL SELECT '0118', '2026-11-19 08:20:00', '2026-11-19 17:20:00', '09:00:00', '00:20:00'
    UNION ALL SELECT '0119', '2026-11-20 08:30:00', '2026-11-20 17:30:00', '09:00:00', '00:25:00'
) AS datos
WHERE NOT EXISTS (
    SELECT 1 FROM registroAgente existente
    WHERE existente.idAgeRegAge = datos.idAge
      AND existente.fecHoraIniRegAge = datos.inicio
);

-- 20 gestiones de prueba para el día actual, con casos para los estados
-- "En proceso" y "Sin gestión". Ejecutar después de cargar la base inicial.
INSERT IGNORE INTO baseDatosCliente
    (idTipDoCli, idBarCli, codCamCli, idCli, nomCli, emaCli, dirCli, telCli, obsCli)
VALUES
    (1, 1, 1, '9000000100', 'Cliente Demo 0100', 'demo0100@example.com', 'Calle Demo 100', '3109000100', 'Cliente de prueba'),
    (1, 2, 2, '9000000101', 'Cliente Demo 0101', 'demo0101@example.com', 'Calle Demo 101', '3109000101', 'Cliente de prueba'),
    (1, 1, 1, '9000000102', 'Cliente Demo 0102', 'demo0102@example.com', 'Calle Demo 102', '3109000102', 'Cliente de prueba'),
    (1, 2, 2, '9000000103', 'Cliente Demo 0103', 'demo0103@example.com', 'Calle Demo 103', '3109000103', 'Cliente de prueba'),
    (1, 1, 1, '9000000104', 'Cliente Demo 0104', 'demo0104@example.com', 'Calle Demo 104', '3109000104', 'Cliente de prueba'),
    (1, 2, 2, '9000000105', 'Cliente Demo 0105', 'demo0105@example.com', 'Calle Demo 105', '3109000105', 'Cliente de prueba'),
    (1, 1, 1, '9000000106', 'Cliente Demo 0106', 'demo0106@example.com', 'Calle Demo 106', '3109000106', 'Cliente de prueba'),
    (1, 2, 2, '9000000107', 'Cliente Demo 0107', 'demo0107@example.com', 'Calle Demo 107', '3109000107', 'Cliente de prueba'),
    (1, 1, 1, '9000000108', 'Cliente Demo 0108', 'demo0108@example.com', 'Calle Demo 108', '3109000108', 'Cliente de prueba'),
    (1, 2, 2, '9000000109', 'Cliente Demo 0109', 'demo0109@example.com', 'Calle Demo 109', '3109000109', 'Cliente de prueba'),
    (1, 1, 1, '9000000110', 'Cliente Demo 0110', 'demo0110@example.com', 'Calle Demo 110', '3109000110', 'Cliente de prueba'),
    (1, 2, 2, '9000000111', 'Cliente Demo 0111', 'demo0111@example.com', 'Calle Demo 111', '3109000111', 'Cliente de prueba'),
    (1, 1, 1, '9000000112', 'Cliente Demo 0112', 'demo0112@example.com', 'Calle Demo 112', '3109000112', 'Cliente de prueba'),
    (1, 2, 2, '9000000113', 'Cliente Demo 0113', 'demo0113@example.com', 'Calle Demo 113', '3109000113', 'Cliente de prueba'),
    (1, 1, 1, '9000000114', 'Cliente Demo 0114', 'demo0114@example.com', 'Calle Demo 114', '3109000114', 'Cliente de prueba'),
    (1, 2, 2, '9000000115', 'Cliente Demo 0115', 'demo0115@example.com', 'Calle Demo 115', '3109000115', 'Cliente de prueba'),
    (1, 1, 1, '9000000116', 'Cliente Demo 0116', 'demo0116@example.com', 'Calle Demo 116', '3109000116', 'Cliente de prueba'),
    (1, 2, 2, '9000000117', 'Cliente Demo 0117', 'demo0117@example.com', 'Calle Demo 117', '3109000117', 'Cliente de prueba'),
    (1, 1, 1, '9000000118', 'Cliente Demo 0118', 'demo0118@example.com', 'Calle Demo 118', '3109000118', 'Cliente de prueba'),
    (1, 2, 2, '9000000119', 'Cliente Demo 0119', 'demo0119@example.com', 'Calle Demo 119', '3109000119', 'Cliente de prueba');

INSERT INTO asignacionLlamada (conAseAsi, conCliAsi, fecAsi, conAteAsi)
SELECT ba.conAse, c.conCli, CURDATE(), 1
FROM baseDatosAsesor ba
INNER JOIN baseDatosCliente c ON c.codCamCli = ba.codCamAse
INNER JOIN (
    SELECT '0100' AS idAge, '9000000100' AS idCli UNION ALL SELECT '0101', '9000000101'
    UNION ALL SELECT '0102', '9000000102' UNION ALL SELECT '0103', '9000000103'
    UNION ALL SELECT '0104', '9000000104' UNION ALL SELECT '0105', '9000000105'
    UNION ALL SELECT '0106', '9000000106' UNION ALL SELECT '0107', '9000000107'
    UNION ALL SELECT '0108', '9000000108' UNION ALL SELECT '0109', '9000000109'
    UNION ALL SELECT '0110', '9000000110' UNION ALL SELECT '0111', '9000000111'
    UNION ALL SELECT '0112', '9000000112' UNION ALL SELECT '0113', '9000000113'
    UNION ALL SELECT '0114', '9000000114' UNION ALL SELECT '0115', '9000000115'
    UNION ALL SELECT '0116', '9000000116' UNION ALL SELECT '0117', '9000000117'
    UNION ALL SELECT '0118', '9000000118' UNION ALL SELECT '0119', '9000000119'
) demo ON demo.idAge = ba.idAgeAse AND demo.idCli = c.idCli
WHERE NOT EXISTS (
    SELECT 1
    FROM asignacionLlamada existente
    WHERE existente.conAseAsi = ba.conAse
      AND existente.conCliAsi = c.conCli
      AND existente.fecAsi = CURDATE()
);

INSERT INTO interaccion
    (conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt,
     fecInt, horIniInt, horFinInt, tieProInt, obsInt)
SELECT ba.conAse, c.conCli, t.codTip, 1, demo.statusId,
       'Gestión de prueba datosPrueba20',
       CURDATE(), demo.startTime, demo.endTime, demo.duration,
       CONCAT('Interacción demo registrada hoy para el agente ', demo.idAge)
FROM (
    SELECT '0100' AS idAge, '9000000100' AS idCli, 1 AS campaignId, 1 AS statusId,  '08:00:00' AS startTime, '08:08:00' AS endTime, '00:08:00' AS duration, 'Contacto efectivo' AS typification UNION ALL
    SELECT '0101', '9000000101', 2, 2, '08:10:00', '08:20:00', '00:10:00', 'Volver a llamar' UNION ALL
    SELECT '0102', '9000000102', 1, 3, '08:20:00', '08:27:00', '00:07:00', 'Buzón de mensajes' UNION ALL
    SELECT '0103', '9000000103', 2, 1, '08:30:00', '08:42:00', '00:12:00', 'Contacto efectivo' UNION ALL
    SELECT '0104', '9000000104', 1, 2, '08:40:00', '08:52:00', '00:12:00', 'Volver a llamar' UNION ALL
    SELECT '0105', '9000000105', 2, 3, '08:50:00', '08:58:00', '00:08:00', 'Número equivocado' UNION ALL
    SELECT '0106', '9000000106', 1, 1, '09:00:00', '09:09:00', '00:09:00', 'Contacto efectivo' UNION ALL
    SELECT '0107', '9000000107', 2, 2, '09:10:00', '09:22:00', '00:12:00', 'Volver a llamar' UNION ALL
    SELECT '0108', '9000000108', 1, 3, '09:20:00', '09:29:00', '00:09:00', 'Buzón de mensajes' UNION ALL
    SELECT '0109', '9000000109', 2, 1, '09:30:00', '09:40:00', '00:10:00', 'Contacto efectivo' UNION ALL
    SELECT '0110', '9000000110', 1, 2, '09:40:00', '09:52:00', '00:12:00', 'Volver a llamar' UNION ALL
    SELECT '0111', '9000000111', 2, 3, '09:50:00', '10:00:00', '00:10:00', 'Número equivocado' UNION ALL
    SELECT '0112', '9000000112', 1, 1, '10:00:00', '10:08:00', '00:08:00', 'Contacto efectivo' UNION ALL
    SELECT '0113', '9000000113', 2, 2, '10:10:00', '10:21:00', '00:11:00', 'Volver a llamar' UNION ALL
    SELECT '0114', '9000000114', 1, 3, '10:20:00', '10:30:00', '00:10:00', 'Buzón de mensajes' UNION ALL
    SELECT '0115', '9000000115', 2, 1, '10:30:00', '10:39:00', '00:09:00', 'Contacto efectivo' UNION ALL
    SELECT '0116', '9000000116', 1, 2, '10:40:00', '10:52:00', '00:12:00', 'Volver a llamar' UNION ALL
    SELECT '0117', '9000000117', 2, 3, '10:50:00', '11:00:00', '00:10:00', 'Número equivocado' UNION ALL
    SELECT '0118', '9000000118', 1, 1, '11:00:00', '11:08:00', '00:08:00', 'Contacto efectivo' UNION ALL
    SELECT '0119', '9000000119', 2, 2, '11:10:00', '11:22:00', '00:12:00', 'Volver a llamar'
) demo
INNER JOIN baseDatosAsesor ba ON ba.idAgeAse = demo.idAge
INNER JOIN baseDatosCliente c ON c.idCli = demo.idCli AND c.codCamCli = demo.campaignId
INNER JOIN tipificacion t ON t.codCamTip = demo.campaignId AND t.nomTip = demo.typification
WHERE NOT EXISTS (
    SELECT 1
    FROM interaccion existente
    WHERE existente.conAseInt = ba.conAse
      AND existente.conCliInt = c.conCli
      AND existente.fecInt = CURDATE()
);

INSERT INTO caso (codIntCas, comIntCas, fecIniCas, fecCieCas)
SELECT i.codInt,
       CONCAT('Caso demo de seguimiento para ', DATE_FORMAT(i.fecInt, '%Y-%m-%d')),
       i.fecInt,
       NULL
FROM interaccion i
INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
WHERE i.fecInt = CURDATE()
  AND i.obsInt LIKE 'Interacción demo registrada hoy%'
  AND i.idEstCasInt IN (2, 3)
  AND NOT EXISTS (
      SELECT 1 FROM caso casoExistente WHERE casoExistente.codIntCas = i.codInt
  );

-- 10 llamadas adicionales para probar los indicadores y el detalle de
-- tipificaciones con más de una llamada por agente en el mismo día.
INSERT INTO interaccion
    (conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt,
     fecInt, horIniInt, horFinInt, tieProInt, obsInt)
SELECT ba.conAse, c.conCli, t.codTip, 1, demo.statusId,
       'Gestión adicional indicadores datosPrueba20',
       CURDATE(), demo.startTime, demo.endTime, demo.duration,
       CONCAT('Llamada adicional demo para el agente ', demo.idAge)
FROM (
    SELECT '0100' AS idAge, '9000000100' AS idCli, 1 AS campaignId, 1 AS statusId, '12:00:00' AS startTime, '12:06:00' AS endTime, '00:06:00' AS duration, 'Volver a llamar' AS typification UNION ALL
    SELECT '0101', '9000000101', 2, 2, '12:10:00', '12:18:00', '00:08:00', 'Contacto efectivo' UNION ALL
    SELECT '0102', '9000000102', 1, 3, '12:20:00', '12:25:00', '00:05:00', 'Número equivocado' UNION ALL
    SELECT '0103', '9000000103', 2, 1, '12:30:00', '12:39:00', '00:09:00', 'Buzón de mensajes' UNION ALL
    SELECT '0104', '9000000104', 1, 2, '12:40:00', '12:50:00', '00:10:00', 'Contacto efectivo' UNION ALL
    SELECT '0105', '9000000105', 2, 3, '12:50:00', '12:56:00', '00:06:00', 'Volver a llamar' UNION ALL
    SELECT '0106', '9000000106', 1, 1, '13:00:00', '13:07:00', '00:07:00', 'Buzón de mensajes' UNION ALL
    SELECT '0107', '9000000107', 2, 2, '13:10:00', '13:19:00', '00:09:00', 'Número equivocado' UNION ALL
    SELECT '0108', '9000000108', 1, 3, '13:20:00', '13:27:00', '00:07:00', 'Contacto efectivo' UNION ALL
    SELECT '0109', '9000000109', 2, 1, '13:30:00', '13:38:00', '00:08:00', 'Volver a llamar'
) demo
INNER JOIN baseDatosAsesor ba ON ba.idAgeAse = demo.idAge
INNER JOIN baseDatosCliente c ON c.idCli = demo.idCli AND c.codCamCli = demo.campaignId
INNER JOIN tipificacion t ON t.codCamTip = demo.campaignId AND t.nomTip = demo.typification
WHERE NOT EXISTS (
    SELECT 1
    FROM interaccion existente
    WHERE existente.conAseInt = ba.conAse
      AND existente.conCliInt = c.conCli
      AND existente.fecInt = CURDATE()
      AND existente.motInt = 'Gestión adicional indicadores datosPrueba20'
);

INSERT INTO caso (codIntCas, comIntCas, fecIniCas, fecCieCas)
SELECT i.codInt,
       CONCAT('Caso adicional de seguimiento para ', DATE_FORMAT(i.fecInt, '%Y-%m-%d')),
       i.fecInt,
       NULL
FROM interaccion i
WHERE i.fecInt = CURDATE()
  AND i.motInt = 'Gestión adicional indicadores datosPrueba20'
  AND i.idEstCasInt IN (2, 3)
  AND NOT EXISTS (
      SELECT 1 FROM caso casoExistente WHERE casoExistente.codIntCas = i.codInt
  );
