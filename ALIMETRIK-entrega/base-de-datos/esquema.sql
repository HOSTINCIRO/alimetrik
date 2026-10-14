-- =====================================================================
-- ALIMETRIK - Modelo relacional equivalente de la base de datos
-- ---------------------------------------------------------------------
-- El sistema embebido no usa un motor SQL: guarda las tablas como
-- archivos binarios de registros de tamano fijo en la memoria flash
-- (mas rapido y sin dependencias en un microcontrolador). Este script
-- documenta el MISMO modelo en SQL estandar, para efectos de diseno,
-- documentacion academica y una eventual migracion a servidor.
-- Motor de referencia: SQLite / MySQL.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla: usuarios      (archivo real: /almacen/usuarios.dat)
-- Encargados que administran el sistema.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario     VARCHAR(23)  NOT NULL UNIQUE,   -- nombre de acceso
    nombre      VARCHAR(47)  NOT NULL,          -- nombre completo
    sal         BLOB(8)      NOT NULL,          -- sal aleatoria por usuario
    hash        BLOB(32)     NOT NULL,          -- SHA-256(sal || contrasena)
    rol         TINYINT      NOT NULL DEFAULT 0,-- 0=operador, 1=administrador
    activo      TINYINT      NOT NULL DEFAULT 1,
    creado      INTEGER      NOT NULL
);

-- ---------------------------------------------------------------------
-- Tabla: estudiantes   (archivo real: /almacen/estudian.dat)
-- Beneficiarios del comedor y su autorizacion de datos biometricos.
-- ---------------------------------------------------------------------
CREATE TABLE estudiantes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    documento       VARCHAR(23) NOT NULL UNIQUE,
    nombre          VARCHAR(39) NOT NULL,
    apellido        VARCHAR(39),
    grado           VARCHAR(11),
    activo          TINYINT NOT NULL DEFAULT 1,
    creado          INTEGER NOT NULL,
    -- Consentimiento informado (Ley 1581 de 2012, arts. 5, 6 y 9)
    autorizacion    TINYINT NOT NULL DEFAULT 0, -- 1 = autorizo el uso de la huella
    acudiente       VARCHAR(59),                -- representante legal que autoriza
    doc_acudiente   VARCHAR(23),                -- su documento de identidad
    fecha_autoriza  CHAR(10)                    -- AAAA-MM-DD de la autorizacion
);

-- ---------------------------------------------------------------------
-- Tabla: huellas       (archivo real: /almacen/huellas.dat)
-- Plantillas biometricas. NO contienen imagenes: solo las coordenadas
-- y angulos de las minucias, de las que no se puede reconstruir el dedo.
-- Se guardan 3 muestras por dedo para mejorar la precision.
-- ---------------------------------------------------------------------
CREATE TABLE huellas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id   INTEGER NOT NULL,
    dedo            VARCHAR(23) DEFAULT 'principal',
    plantilla       BLOB    NOT NULL,           -- 200 minucias: x, y, angulo
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);
CREATE INDEX idx_huellas_estudiante ON huellas(estudiante_id);

-- ---------------------------------------------------------------------
-- Tabla: registros     (archivo real: /almacen/registro.dat)
-- Bitacora de cada verificacion en el comedor. Rota al llegar a 2000
-- descartando el mas antiguo.
-- ---------------------------------------------------------------------
CREATE TABLE registros (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id   INTEGER,                    -- NULL/0 = no identificado
    servicio        VARCHAR(23) NOT NULL,       -- Desayuno | Almuerzo | Refrigerio |
                                                -- Fuera de horario
    resultado       VARCHAR(19) NOT NULL,       -- permitido | duplicado | no_autorizado |
                                                -- desconocido | sin_servicio
    score           INTEGER,                    -- puntaje de coincidencia
    fecha           CHAR(10) NOT NULL,          -- AAAA-MM-DD
    hora            CHAR(8)  NOT NULL,          -- HH:MM:SS
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
);
CREATE INDEX idx_registros_dia ON registros(fecha, servicio, estudiante_id);

-- ---------------------------------------------------------------------
-- Tabla: servicios     (archivo real: /almacen/servicio.dat)
-- Franjas horarias configurables desde el portal. Fuera de ellas no se
-- entrega racion (resultado "sin_servicio").
-- ---------------------------------------------------------------------
CREATE TABLE servicios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      VARCHAR(23) NOT NULL,       -- Desayuno, Almuerzo, Refrigerio...
    inicio      SMALLINT NOT NULL,          -- minutos desde medianoche (06:00 = 360)
    fin         SMALLINT NOT NULL,          -- minutos desde medianoche (10:00 = 600)
    activo      TINYINT  NOT NULL DEFAULT 1,
    CHECK (inicio >= 0 AND inicio < 1440),
    CHECK (fin    >= 0 AND fin   <= 1440)
);

-- Servicios habituales que crea el sistema la primera vez
INSERT INTO servicios (nombre, inicio, fin, activo) VALUES
    ('Desayuno',    360,  600, 1),   -- 06:00 a 10:00
    ('Almuerzo',    660,  870, 1),   -- 11:00 a 14:30
    ('Refrigerio',  870, 1020, 1);   -- 14:30 a 17:00

-- =====================================================================
-- CONSULTAS DE USO FRECUENTE
-- =====================================================================

-- Regla anti-duplicado: ¿ya recibio este servicio hoy?
SELECT COUNT(*) FROM registros
 WHERE estudiante_id = :id AND servicio = :servicio
   AND fecha = :hoy AND resultado = 'permitido';

-- Raciones entregadas hoy, por servicio
SELECT servicio, COUNT(*) AS entregadas
  FROM registros
 WHERE fecha = :hoy AND resultado = 'permitido'
 GROUP BY servicio;

-- Cobertura: alumnos distintos atendidos hoy en el servicio actual
SELECT COUNT(DISTINCT estudiante_id)
  FROM registros
 WHERE fecha = :hoy AND servicio = :servicio AND resultado = 'permitido';

-- Servicio que corresponde a una hora dada (:minuto = hora*60 + minutos)
SELECT nombre FROM servicios
 WHERE activo = 1 AND :minuto >= inicio AND :minuto < fin
 LIMIT 1;

-- Alumnos registrados sin huella enrolada
SELECT e.documento, e.nombre, e.apellido
  FROM estudiantes e
  LEFT JOIN huellas h ON h.estudiante_id = e.id
 WHERE h.id IS NULL AND e.activo = 1;

-- Ejercicio del derecho de supresion (Ley 1581, art. 8, lit. e)
DELETE FROM huellas WHERE estudiante_id = :id;
UPDATE estudiantes SET autorizacion = 0, activo = 0 WHERE id = :id;
