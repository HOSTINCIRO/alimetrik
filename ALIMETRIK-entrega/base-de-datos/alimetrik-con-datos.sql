-- ============================================================
-- ALIMETRIK - Base de datos MySQL/MariaDB COMPLETA (con datos)
-- Es exactamente la base que se muestra en los pantallazos de
-- phpMyAdmin de la entrega: 5 tablas + datos de ejemplo.
--
-- Como importarla:
--   mysql --default-character-set=utf8mb4 < alimetrik-con-datos.sql
-- o en phpMyAdmin: pestana "Importar" -> elegir este archivo.
-- (Crea la base 'alimetrik'; si ya existe, la reemplaza.)
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.3.2-MariaDB, for osx10.21 (arm64)
--
-- Host: localhost    Database: alimetrik
-- ------------------------------------------------------
-- Server version	12.3.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `alimetrik`
--

/*!40000 DROP DATABASE IF EXISTS `alimetrik`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `alimetrik` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `alimetrik`;

--
-- Table structure for table `estudiantes`
--

DROP TABLE IF EXISTS `estudiantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudiantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `documento` varchar(23) NOT NULL,
  `nombre` varchar(39) NOT NULL,
  `apellido` varchar(39) DEFAULT NULL,
  `grado` varchar(11) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `creado` int(11) NOT NULL,
  `autorizacion` tinyint(4) NOT NULL DEFAULT 0,
  `acudiente` varchar(59) NOT NULL,
  `doc_acudiente` varchar(23) NOT NULL,
  `fecha_autoriza` char(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documento` (`documento`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estudiantes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `estudiantes` WRITE;
/*!40000 ALTER TABLE `estudiantes` DISABLE KEYS */;
INSERT INTO `estudiantes` VALUES
(1,'1094523871','Juan Sebastián','Pérez Rojas','11-A',1,1,1,'María Rojas','52148963','2026-08-12'),
(2,'1094523902','Ana María','Gómez Díaz','10-B',1,2,1,'Carlos Gómez','79541236','2026-08-12'),
(3,'1094524115','Camilo','Gutiérrez Peña','11-A',1,3,1,'Luz Peña','43876521','2026-08-13'),
(4,'1094524233','Valentina','Martínez Silva','9-C',1,4,1,'Jorge Martínez','80123457','2026-08-13'),
(5,'1094524388','Felipe','González Torres','10-A',1,5,1,'Sandra Torres','52987412','2026-08-14');
/*!40000 ALTER TABLE `estudiantes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `huellas`
--

DROP TABLE IF EXISTS `huellas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `huellas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `estudiante_id` int(11) NOT NULL,
  `dedo` varchar(23) DEFAULT 'principal',
  `plantilla` blob NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_huellas_estudiante` (`estudiante_id`),
  CONSTRAINT `1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `huellas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `huellas` WRITE;
/*!40000 ALTER TABLE `huellas` DISABLE KEYS */;
INSERT INTO `huellas` VALUES
(13,1,'muestra 1',0x2A00000041003C00),
(14,1,'muestra 2',0x2B00000042003D00),
(15,1,'muestra 3',0x2C00000043003E00),
(16,2,'muestra 1',0x3A00000051004C00),
(17,2,'muestra 2',0x3B00000052004D00),
(18,2,'muestra 3',0x3C00000053004E00),
(19,3,'muestra 1',0x4A00000061005C00),
(20,3,'muestra 2',0x4B00000062005D00),
(21,3,'muestra 3',0x4C00000063005E00),
(22,4,'muestra 1',0x5A00000071006C00),
(23,4,'muestra 2',0x5B00000072006D00),
(24,4,'muestra 3',0x5C00000073006E00);
/*!40000 ALTER TABLE `huellas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `registros`
--

DROP TABLE IF EXISTS `registros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `registros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `estudiante_id` int(11) DEFAULT NULL,
  `servicio` varchar(23) NOT NULL,
  `resultado` varchar(19) NOT NULL,
  `score` int(11) DEFAULT NULL,
  `fecha` char(10) NOT NULL,
  `hora` char(8) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `estudiante_id` (`estudiante_id`),
  KEY `idx_registros_dia` (`fecha`,`servicio`,`estudiante_id`),
  CONSTRAINT `1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registros`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `registros` WRITE;
/*!40000 ALTER TABLE `registros` DISABLE KEYS */;
INSERT INTO `registros` VALUES
(10,1,'Desayuno','permitido',41,'2026-08-19','07:12:30'),
(11,2,'Desayuno','permitido',38,'2026-08-19','07:14:05'),
(12,3,'Desayuno','permitido',29,'2026-08-19','07:15:48'),
(13,1,'Almuerzo','permitido',41,'2026-08-19','12:33:58'),
(14,NULL,'Almuerzo','desconocido',9,'2026-08-19','12:35:20'),
(15,2,'Almuerzo','permitido',38,'2026-08-19','12:36:44'),
(16,3,'Almuerzo','permitido',29,'2026-08-19','12:38:15'),
(17,3,'Almuerzo','duplicado',31,'2026-08-19','12:39:52'),
(18,4,'Almuerzo','permitido',34,'2026-08-19','12:41:07');
/*!40000 ALTER TABLE `registros` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `servicios`
--

DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(23) NOT NULL,
  `inicio` smallint(6) NOT NULL,
  `fin` smallint(6) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`inicio` >= 0 and `inicio` < 1440),
  CONSTRAINT `CONSTRAINT_2` CHECK (`fin` >= 0 and `fin` <= 1440)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `servicios` WRITE;
/*!40000 ALTER TABLE `servicios` DISABLE KEYS */;
INSERT INTO `servicios` VALUES
(1,'Desayuno',360,600,1),
(2,'Almuerzo',660,870,1),
(3,'Refrigerio',870,1020,1);
/*!40000 ALTER TABLE `servicios` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario` varchar(23) NOT NULL,
  `nombre` varchar(47) NOT NULL,
  `sal` tinyblob NOT NULL,
  `hash` tinyblob NOT NULL,
  `rol` tinyint(4) NOT NULL DEFAULT 0,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `creado` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
(1,'admin','Coordinación del Comedor',0xA1B2C3D4E5F60718,0x3B4F2A9C71E5D8630F1A2B4C5D6E7F8091A2B3C4D5E6F708192A3B4C5D6E7F80,1,1,1),
(2,'maria','María Rojas (operadora)',0x9F8E7D6C5B4A3928,0x7C1D3E5F79B2D4F60A1C3E5079B2D4F60A1C3E5079B2D4F60A1C3E5079B2D4F6,0,1,2);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-13 21:21:31
