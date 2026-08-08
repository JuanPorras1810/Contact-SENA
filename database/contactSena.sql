create database contactSena;
use contactSena;

-- TABLAS DE CONFIGURACION
create table tipoDocumento(
idTipDoc int auto_increment,
nomTipDoc varchar(50) NOT NULL,
primary key(idTipDoc)
);

create table canalContacto(
idCanInt int auto_increment,
nomCanInt varchar(30) NOT NULL,
primary key(idCanInt)
);

create table estadoCaso(
idEstCas int auto_increment,
nomEstCas varchar(30) NOT NULL,
primary key(idEstCas)
);

insert into tipoDocumento (nomTipDoc) values ('Cedula de Ciudadania'), ('Cedula de Extranjeria'), ('Pasaporte');
insert into canalContacto (nomCanInt) values ('Llamada'), ('Chat'), ('Correo');
insert into estadoCaso (nomEstCas) values ('Abierto'), ('Cerrado'), ('Escalado');


-- TABLAS DE GEOGRAFIA
create table departamento(
idDep int auto_increment,
nomDep varchar(100) NOT NULL,
primary key(idDep)
);

create table municipio(
idMun int auto_increment,
idDepMun int NOT NULL,
nomMun varchar(100) NOT NULL,
primary key(idMun),
foreign key(idDepMun) references departamento(idDep)
);

create table barrio(
idBar int auto_increment,
idMunBar int NOT NULL, 
nomBar varchar(150) NOT NULL,
primary key(idBar),
foreign key(idMunBar) references municipio(idMun)
);

insert into departamento (nomDep) values ('Santander'), ('Antioquia');
insert into municipio (idDepMun, nomMun) values (1, 'Municipio A'), (2, 'Municipio B');
insert into barrio (idMunBar, nomBar) values (1, 'Barrio A'), (2, 'Barrio B');


-- TABLAS DE USUARIOS
create table supervisor(
idSup varchar(11) NOT NULL,
idTipDocSup int NOT NULL,
idBarSup int NOT NULL,  
nomSup varchar(60) NOT NULL,
emaSup varchar(100) NOT NULL,
dirSup varchar(60) NOT NULL,
telSup varchar(10) NOT NULL,
telAltSup varchar(10),
conSup varchar(60) NOT NULL,
fotSup varchar(500),
primary key(idSup),
foreign key(idTipDocSup) references tipoDocumento(idTipDoc),
foreign key(idBarSup) references barrio(idBar)
);

create table agente(
idAge varchar(11) NOT NULL,
idTipDocAge int NOT NULL,
idBarAge int NOT NULL,
nomAge varchar(60) NOT NULL,
emaAge varchar(100) NOT NULL,
dirAge varchar(60) NOT NULL,
telAge varchar(10) NOT NULL,
telAltAge varchar(10),
conAge varchar(60) NOT NULL,
fotAge varchar(500),
primary key(idAge),
foreign key(idTipDocAge) references tipoDocumento(idTipDoc),
foreign key(idBarAge) references barrio(idBar)
);


-- TABLAS DE REGISTRO DE SESION
create table registroSupervisor(
codRegSup int auto_increment,
idSupRegSup varchar(11) NOT NULL,
fecHoraIniRegSup datetime NOT NULL,
fecHoraCieRegSup datetime,
tieTotRegSup time,
primary key(codRegSup),
foreign key(idSupRegSup) references supervisor(idSup)
);

create table registroAgente(
codRegAge int auto_increment,
idAgeRegAge varchar(11) NOT NULL,
fecHoraIniRegAge datetime NOT NULL,
fecHoraCieRegAge datetime,
tieTotRegAge time,
primary key(codRegAge),
foreign key(idAgeRegAge) references agente(idAge)
);


-- TABLAS DE ENTIDADES OPERATIVAS Y CLIENTES
create table campana(
codCam int auto_increment,
nomCam varchar(500) NOT NULL,
fecIniCam date NOT NULL,
fecFinCam date NOT NULL,
proCam varchar(250),
primary key(codCam)
);

create table baseDatosCliente(
conCli int auto_increment,
idTipDoCli int NOT NULL, 
idBarCli int,
codCamCli int NOT NULL,
idCli varchar(11) NOT NULL,
nomCli varchar(60),
emaCli varchar(100),
dirCli varchar(60),
telCli varchar(10) NOT NULL,
telAltCli varchar(10),
obsCli varchar(300),
primary key(conCli),
unique(idCli),
foreign key(idTipDoCli) references tipoDocumento(idTipDoc),
foreign key(idBarCli) references barrio(idBar),
foreign key(codCamCli) references campana(codCam)
);

create table baseDatosAsesor(
conAse int auto_increment,
idAgeAse varchar(11) NOT NULL,
codCamAse int NOT NULL,
primary key(conAse),
foreign key(idAgeAse) references agente(idAge),
foreign key(codCamAse) references campana(codCam)
);

create table asignacionLlamada(
codAsi int auto_increment,
conAseAsi int NOT NULL,
conCliAsi int NOT NULL, 
fecAsi date NOT NULL,
conAteAsi boolean,
primary key(codAsi),
foreign key(conAseAsi) references baseDatosAsesor(conAse),
foreign key(conCliAsi) references baseDatosCliente(conCli)
);

create table tipificacion(
codTip int auto_increment,
codCamTip int NOT NULL,
nomTip varchar(100) NOT NULL,
primary key(codTip),
foreign key(codCamTip) references campana(codCam)
);

create table interaccion(
codInt int auto_increment,
conAseInt int NOT NULL,
conCliInt int NOT NULL,
codTipInt int NOT NULL,
idCanInt int NOT NULL,
idEstCasInt int NOT NULL,
motInt text NOT NULL,
fecInt date NOT NULL,
horIniInt time NOT NULL,
horFinInt time NOT NULL,
tieProInt time NOT NULL,
obsInt text NOT NULL,
primary key(codInt),
foreign key(conAseInt) references baseDatosAsesor(conAse),
foreign key(conCliInt) references baseDatosCliente(conCli),
foreign key(codTipInt) references tipificacion(codTip),
foreign key(idCanInt) references canalContacto(idCanInt),
foreign key(idEstCasInt) references estadoCaso(idEstCas)
);

create table caso(
codCas int auto_increment,
codIntCas int NOT NULL,
comIntCas text NOT NULL,
fecIniCas date NOT NULL,
fecCieCas date,
primary key(codCas),
foreign key(codIntCas) references interaccion(codInt)
);

-- DATOS DE PRUEBA ACTUALIZADOS

-- Supervisores
insert into supervisor(idSup, idTipDocSup, idBarSup, nomSup, emaSup, dirSup, telSup, telAltSup, conSup, fotSup)
values('0001', 1, 1, 'Juan Porras', 'juan@gmail.com', 'Calle 1', '3001111111', '3002222222', 'juan123', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUOyqodwhEv9W2Kg1vliivMwE_62tckk9uhTA10Ckl4Q&s=10'),
('0002', 1, 2, 'Carlos Mendoza', 'carlos.m@gmail.com', 'Av 5', '3159998888', NULL, 'carlos123', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5Oc5BWka_gHSA1ylo22zPPRnmKWuTBR1VkFL5AhO5xw&s=10');

-- Agentes
insert into agente(idAge, idTipDocAge, idBarAge, nomAge, emaAge, dirAge, telAge, telAltAge, conAge, fotAge)
values('0003', 1, 1, 'Maria Lopez', 'maria@gmail.com', 'Calle 2', '3003333333', NULL, 'maria123', 'https://b2472105.assetcdn.net/2.0/2472105/wp-content/uploads/2023/09/Poses-Perfil-Profesional-Mujeres-ago.-10-2023-1-819x1024.jpg?lossy=1&strip=1&webp=1'),
('0004', 1, 2, 'Luis Gomez', 'luis@gmail.com', 'Calle 3', '3007777777', NULL, 'luis123', NULL);

-- Campañas
insert into campana(nomCam, fecIniCam, fecFinCam, proCam)
values('Campaña Ventas 1', '2026-01-01', '2026-12-31', NULL),
('Campaña Ventas 2', '2026-02-01', '2026-11-30', NULL);

-- Asesores 
insert into baseDatosAsesor(idAgeAse, codCamAse)
values ('0003', 1),
('0004', 2);

-- Clientes
insert into baseDatosCliente(idTipDoCli, idBarCli, codCamCli, idCli, nomCli, emaCli, dirCli, telCli, telAltCli, obsCli)
values(1, 1, 1, '0005', 'Carlos Ruiz', 'carlos@gmail.com', 'Calle 4', '3004444444', NULL, 'Cliente con ubicacion en Campaña 1'),
(1, NULL, 2, '0006', 'Ana Torres', 'ana@gmail.com', NULL, '3005555555', '3006666666', 'Cliente sin ubicacion en Campaña 2');

-- Registros de Sesión de Supervisores
insert into registroSupervisor(idSupRegSup, fecHoraIniRegSup, fecHoraCieRegSup, tieTotRegSup)
values('0001', '2026-04-01 08:00:00', '2026-04-01 17:00:00', '09:00:00'),
('0002', '2026-04-01 09:00:00', '2026-04-01 18:00:00', '09:00:00');

-- Registros de Sesión de Agentes
insert into registroAgente(idAgeRegAge, fecHoraIniRegAge, fecHoraCieRegAge, tieTotRegAge)
values('0003', '2026-04-02 08:30:00', '2026-04-02 17:30:00', '09:00:00'),
('0004', '2026-04-02 08:00:00', '2026-04-02 16:00:00', '08:00:00');

-- Asignaciones de Llamadas
insert into asignacionLlamada(conAseAsi, conCliAsi, fecAsi, conAteAsi)
values(1, 1, '2026-04-01', 1),
(2, 2, '2026-04-08', 1);

-- Tipificaciones
insert into tipificacion(codCamTip, nomTip)
values (1, 'Contacto efectivo - Venta Cerrada'),
(2, 'No contesta - Reintentar');

-- Interacciones
insert into interaccion(conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
values(1, 1, 1, 1, 2, 'Consulta de beneficios', '2026-04-10', '09:00:00', '09:10:00', '00:10:00', 'Cliente compra el paquete basico'),
(2, 2, 2, 2, 3, 'Reclamo de cobertura', '2026-04-11', '10:00:00', '10:20:00', '00:20:00', 'Cliente inconforme, requiere revision');

-- Casos
insert into caso(codIntCas, comIntCas, fecIniCas, fecCieCas)
values(1, 'Caso de apertura rutinaria por venta', '2026-04-10', '2026-04-10'),
(2, 'Caso escalado a supervisor por reclamo', '2026-04-11', '2026-04-12');