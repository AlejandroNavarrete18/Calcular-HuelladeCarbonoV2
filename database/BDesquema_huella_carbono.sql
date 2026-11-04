CREATE DATABASE  IF NOT EXISTS `huella_carbono` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `huella_carbono`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: huella_carbono
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administradores`
--

DROP TABLE IF EXISTS `administradores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administradores` (
  `id_administrador` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('superadmin','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `intentos_fallidos` tinyint unsigned NOT NULL DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_administrador`),
  UNIQUE KEY `uq_administradores_correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bitacora_admin`
--

DROP TABLE IF EXISTS `bitacora_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora_admin` (
  `id_bitacora` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_administrador` int unsigned DEFAULT NULL,
  `accion` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_entidad` bigint unsigned DEFAULT NULL,
  `detalle` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_bitacora`),
  KEY `idx_bitacora_admin` (`id_administrador`),
  KEY `idx_bitacora_creado_en` (`creado_en`),
  KEY `idx_bitacora_entidad` (`entidad`,`id_entidad`),
  CONSTRAINT `fk_bitacora_admin` FOREIGN KEY (`id_administrador`) REFERENCES `administradores` (`id_administrador`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cola_correos`
--

DROP TABLE IF EXISTS `cola_correos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cola_correos` (
  `id_cola` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_participacion` bigint unsigned NOT NULL,
  `estado` enum('pendiente','enviando','enviado','fallido','omitido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `intentos` smallint unsigned NOT NULL DEFAULT '0',
  `siguiente_intento_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cola`),
  UNIQUE KEY `uq_cola_correos_participacion` (`id_participacion`),
  KEY `idx_cola_correos_turno` (`estado`,`siguiente_intento_en`,`id_cola`),
  CONSTRAINT `fk_cola_correos_participacion` FOREIGN KEY (`id_participacion`) REFERENCES `participaciones` (`id_participacion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cuentas_correo`
--

DROP TABLE IF EXISTS `cuentas_correo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuentas_correo` (
  `id_cuenta_correo` int unsigned NOT NULL AUTO_INCREMENT,
  `correo` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_remitente` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contrasena_cifrada` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `servidor_smtp` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'smtp.gmail.com',
  `puerto_smtp` smallint unsigned NOT NULL DEFAULT '465',
  `conexion_segura` tinyint(1) NOT NULL DEFAULT '1',
  `prioridad` smallint unsigned NOT NULL DEFAULT '100',
  `limite_diario` int unsigned NOT NULL DEFAULT '400',
  `enviados_hoy` int unsigned NOT NULL DEFAULT '0',
  `fecha_contador` date DEFAULT NULL,
  `total_enviados` bigint unsigned NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `bloqueada_hasta` datetime DEFAULT NULL,
  `ultimo_envio_en` datetime DEFAULT NULL,
  `ultima_reserva_en` datetime(6) DEFAULT NULL,
  `ultimo_error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_error_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuenta_correo`),
  UNIQUE KEY `uq_cuentas_correo_correo` (`correo`),
  KEY `idx_cuentas_correo_seleccion` (`activo`,`prioridad`,`id_cuenta_correo`),
  CONSTRAINT `ck_cuentas_correo_limite` CHECK ((`limite_diario` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `envios_correo`
--

DROP TABLE IF EXISTS `envios_correo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `envios_correo` (
  `id_envio` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_participacion` bigint unsigned DEFAULT NULL,
  `id_cuenta_correo` int unsigned DEFAULT NULL,
  `remitente` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinatario` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asunto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('enviado','fallido') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_mensaje` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_error` enum('cuota','credenciales','destinatario','temporal') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_error` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje_error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_envio`),
  KEY `idx_envios_participacion` (`id_participacion`),
  KEY `idx_envios_cuenta_fecha` (`id_cuenta_correo`,`creado_en`),
  KEY `idx_envios_estado_fecha` (`estado`,`creado_en`),
  KEY `idx_envios_destinatario` (`destinatario`),
  CONSTRAINT `fk_envios_cuenta` FOREIGN KEY (`id_cuenta_correo`) REFERENCES `cuentas_correo` (`id_cuenta_correo`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_envios_participacion` FOREIGN KEY (`id_participacion`) REFERENCES `participaciones` (`id_participacion`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `escuelas_facultades`
--

DROP TABLE IF EXISTS `escuelas_facultades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escuelas_facultades` (
  `id_escuela_facultad` int unsigned NOT NULL AUTO_INCREMENT,
  `id_unidad_regional` int unsigned NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_escuela_facultad`),
  UNIQUE KEY `uq_escuelas_facultades_unidad_nombre` (`id_unidad_regional`,`nombre`),
  UNIQUE KEY `uq_escuelas_facultades_id_unidad` (`id_escuela_facultad`,`id_unidad_regional`),
  CONSTRAINT `fk_escuelas_unidad` FOREIGN KEY (`id_unidad_regional`) REFERENCES `unidades_regionales` (`id_unidad_regional`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `filas_matriz`
--

DROP TABLE IF EXISTS `filas_matriz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `filas_matriz` (
  `id_fila` int unsigned NOT NULL AUTO_INCREMENT,
  `id_pregunta` int unsigned NOT NULL,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `etiqueta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_fila`),
  UNIQUE KEY `uq_filas_pregunta_clave` (`id_pregunta`,`clave`),
  UNIQUE KEY `uq_filas_id_pregunta` (`id_fila`,`id_pregunta`),
  CONSTRAINT `fk_filas_pregunta` FOREIGN KEY (`id_pregunta`) REFERENCES `preguntas` (`id_pregunta`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estados`
--

DROP TABLE IF EXISTS `estados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados` (
  `id_estado` tinyint unsigned NOT NULL COMMENT 'Clave INEGI de la entidad (01 a 32)',
  `nombre` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_estado`),
  UNIQUE KEY `uq_estados_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paises`
--

DROP TABLE IF EXISTS `paises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paises` (
  `codigo` char(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Código ISO 3166-1 alfa-2',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo`),
  UNIQUE KEY `uq_paises_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `municipios`
--

DROP TABLE IF EXISTS `municipios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `municipios` (
  `id_municipio` int unsigned NOT NULL AUTO_INCREMENT,
  `id_estado` tinyint unsigned NOT NULL,
  `clave` smallint unsigned NOT NULL COMMENT 'Clave INEGI del municipio dentro de su estado',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_municipio`),
  UNIQUE KEY `uq_municipios_estado_clave` (`id_estado`,`clave`),
  UNIQUE KEY `uq_municipios_estado_nombre` (`id_estado`,`nombre`),
  UNIQUE KEY `uq_municipios_id_estado` (`id_municipio`,`id_estado`),
  CONSTRAINT `fk_municipios_estado` FOREIGN KEY (`id_estado`) REFERENCES `estados` (`id_estado`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opciones`
--

DROP TABLE IF EXISTS `opciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones` (
  `id_opcion` int unsigned NOT NULL AUTO_INCREMENT,
  `id_pregunta` int unsigned NOT NULL,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `etiqueta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kg_co2` decimal(10,2) DEFAULT NULL,
  `horas` decimal(4,2) DEFAULT NULL,
  `orden` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_opcion`),
  UNIQUE KEY `uq_opciones_pregunta_clave` (`id_pregunta`,`clave`),
  UNIQUE KEY `uq_opciones_id_pregunta` (`id_opcion`,`id_pregunta`),
  CONSTRAINT `fk_opciones_pregunta` FOREIGN KEY (`id_pregunta`) REFERENCES `preguntas` (`id_pregunta`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `participaciones`
--

DROP TABLE IF EXISTS `participaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participaciones` (
  `id_participacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `codigo_pais` char(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'País de residencia (ISO 3166-1 alfa-2)',
  `id_estado` tinyint unsigned DEFAULT NULL COMMENT 'Solo para México',
  `id_municipio` int unsigned DEFAULT NULL COMMENT 'Solo para México; pertenece a id_estado',
  `ciudad_provincia` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Solo fuera de México (texto libre)',
  `localidad_comunidad` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_unidad_regional` int unsigned DEFAULT NULL COMMENT 'NULL si la persona es de otra institución',
  `id_escuela_facultad` int unsigned DEFAULT NULL COMMENT 'NULL si la persona es de otra institución',
  `institucion_externa` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Escuela o institución fuera de la UAS (texto libre)',
  `hogar_kg` decimal(10,2) NOT NULL,
  `transporte_kg` decimal(10,2) NOT NULL,
  `consumo_kg` decimal(10,2) NOT NULL,
  `total_kg` decimal(10,2) NOT NULL,
  `nivel` enum('bajo','medio','alto','muy_alto') COLLATE utf8mb4_unicode_ci NOT NULL,
  `respuestas_json` json NOT NULL,
  `correo_enviado` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_participacion`),
  KEY `idx_participaciones_correo` (`correo`),
  KEY `idx_participaciones_creado_en` (`creado_en`),
  KEY `idx_participaciones_nivel` (`nivel`),
  KEY `idx_participaciones_pais` (`codigo_pais`),
  KEY `idx_participaciones_estado` (`id_estado`),
  KEY `idx_participaciones_unidad` (`id_unidad_regional`),
  KEY `idx_participaciones_municipio` (`id_municipio`),
  KEY `idx_participaciones_escuela` (`id_escuela_facultad`),
  KEY `fk_participaciones_municipio` (`id_municipio`,`id_estado`),
  KEY `fk_participaciones_escuela` (`id_escuela_facultad`,`id_unidad_regional`),
  CONSTRAINT `fk_participaciones_pais` FOREIGN KEY (`codigo_pais`) REFERENCES `paises` (`codigo`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participaciones_estado` FOREIGN KEY (`id_estado`) REFERENCES `estados` (`id_estado`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participaciones_municipio` FOREIGN KEY (`id_municipio`, `id_estado`) REFERENCES `municipios` (`id_municipio`, `id_estado`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participaciones_unidad` FOREIGN KEY (`id_unidad_regional`) REFERENCES `unidades_regionales` (`id_unidad_regional`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participaciones_escuela` FOREIGN KEY (`id_escuela_facultad`, `id_unidad_regional`) REFERENCES `escuelas_facultades` (`id_escuela_facultad`, `id_unidad_regional`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_participaciones_telefono` CHECK ((char_length(`telefono`) >= 10)),
  CONSTRAINT `ck_participaciones_totales` CHECK (((`hogar_kg` >= 0) and (`transporte_kg` >= 0) and (`consumo_kg` >= 0) and (`total_kg` >= 0))),
  CONSTRAINT `ck_participaciones_ubicacion` CHECK ((((`codigo_pais` = 'MX') and (`id_estado` is not null) and (`id_municipio` is not null) and (`ciudad_provincia` is null)) or ((`codigo_pais` <> 'MX') and (`id_estado` is null) and (`id_municipio` is null) and (`ciudad_provincia` is not null)))),
  CONSTRAINT `ck_participaciones_institucion` CHECK ((((`id_unidad_regional` is not null) and (`id_escuela_facultad` is not null) and (`institucion_externa` is null)) or ((`id_unidad_regional` is null) and (`id_escuela_facultad` is null) and (`institucion_externa` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pesos_matriz`
--

DROP TABLE IF EXISTS `pesos_matriz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pesos_matriz` (
  `id_fila` int unsigned NOT NULL,
  `id_opcion` int unsigned NOT NULL,
  `kg_co2` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_fila`,`id_opcion`),
  KEY `fk_pesos_opcion` (`id_opcion`),
  CONSTRAINT `fk_pesos_fila` FOREIGN KEY (`id_fila`) REFERENCES `filas_matriz` (`id_fila`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pesos_opcion` FOREIGN KEY (`id_opcion`) REFERENCES `opciones` (`id_opcion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `preguntas`
--

DROP TABLE IF EXISTS `preguntas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preguntas` (
  `id_pregunta` int unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` tinyint unsigned NOT NULL,
  `categoria` enum('hogar','transporte','consumo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitulo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('opcion_unica','opcion_multiple','matriz') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_pregunta`),
  UNIQUE KEY `uq_preguntas_clave` (`clave`),
  UNIQUE KEY `uq_preguntas_numero` (`numero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `respuestas`
--

DROP TABLE IF EXISTS `respuestas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `respuestas` (
  `id_respuesta` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_participacion` bigint unsigned NOT NULL,
  `id_pregunta` int unsigned NOT NULL,
  `id_fila` int unsigned DEFAULT NULL,
  `id_opcion` int unsigned NOT NULL,
  `id_fila_unico` int unsigned GENERATED ALWAYS AS (ifnull(`id_fila`,0)) STORED,
  PRIMARY KEY (`id_respuesta`),
  UNIQUE KEY `uq_respuestas_no_repetida` (`id_participacion`,`id_pregunta`,`id_fila_unico`,`id_opcion`),
  KEY `idx_respuestas_pregunta_opcion` (`id_pregunta`,`id_opcion`),
  KEY `fk_respuestas_opcion` (`id_opcion`,`id_pregunta`),
  KEY `fk_respuestas_fila` (`id_fila`,`id_pregunta`),
  CONSTRAINT `fk_respuestas_fila` FOREIGN KEY (`id_fila`, `id_pregunta`) REFERENCES `filas_matriz` (`id_fila`, `id_pregunta`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_respuestas_opcion` FOREIGN KEY (`id_opcion`, `id_pregunta`) REFERENCES `opciones` (`id_opcion`, `id_pregunta`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_respuestas_participacion` FOREIGN KEY (`id_participacion`) REFERENCES `participaciones` (`id_participacion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sesiones_admin`
--

DROP TABLE IF EXISTS `sesiones_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones_admin` (
  `id_sesion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_administrador` int unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agente_usuario` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_en` datetime NOT NULL,
  `ultima_actividad` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cierre_pendiente_en` datetime DEFAULT NULL,
  `revocada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  UNIQUE KEY `uq_sesiones_admin_token` (`token_hash`),
  KEY `idx_sesiones_admin_admin` (`id_administrador`),
  KEY `idx_sesiones_admin_expira` (`expira_en`),
  CONSTRAINT `fk_sesiones_admin_admin` FOREIGN KEY (`id_administrador`) REFERENCES `administradores` (`id_administrador`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unidades_regionales`
--

DROP TABLE IF EXISTS `unidades_regionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_regionales` (
  `id_unidad_regional` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_unidad_regional`),
  UNIQUE KEY `uq_unidades_regionales_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vista_cuentas_correo_uso`
--

DROP TABLE IF EXISTS `vista_cuentas_correo_uso`;
/*!50001 DROP VIEW IF EXISTS `vista_cuentas_correo_uso`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_cuentas_correo_uso` AS SELECT 
 1 AS `id_cuenta_correo`,
 1 AS `correo`,
 1 AS `prioridad`,
 1 AS `limite_diario`,
 1 AS `enviados_hoy`,
 1 AS `disponibles_hoy`,
 1 AS `total_enviados`,
 1 AS `ultimo_envio_en`,
 1 AS `ultimo_error`,
 1 AS `ultimo_error_en`,
 1 AS `estado`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_resumen_por_escuela_facultad`
--

DROP TABLE IF EXISTS `vista_resumen_por_escuela_facultad`;
/*!50001 DROP VIEW IF EXISTS `vista_resumen_por_escuela_facultad`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_resumen_por_escuela_facultad` AS SELECT 
 1 AS `id_escuela_facultad`,
 1 AS `unidad_regional`,
 1 AS `escuela_facultad`,
 1 AS `participaciones`,
 1 AS `promedio_total_kg`,
 1 AS `promedio_hogar_kg`,
 1 AS `promedio_transporte_kg`,
 1 AS `promedio_consumo_kg`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_resumen_por_unidad_regional`
--

DROP TABLE IF EXISTS `vista_resumen_por_unidad_regional`;
/*!50001 DROP VIEW IF EXISTS `vista_resumen_por_unidad_regional`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_resumen_por_unidad_regional` AS SELECT 
 1 AS `id_unidad_regional`,
 1 AS `unidad_regional`,
 1 AS `participaciones`,
 1 AS `promedio_total_kg`,
 1 AS `promedio_hogar_kg`,
 1 AS `promedio_transporte_kg`,
 1 AS `promedio_consumo_kg`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vista_cuentas_correo_uso`
--

/*!50001 DROP VIEW IF EXISTS `vista_cuentas_correo_uso`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `vista_cuentas_correo_uso` AS select `c`.`id_cuenta_correo` AS `id_cuenta_correo`,`c`.`correo` AS `correo`,`c`.`prioridad` AS `prioridad`,`c`.`limite_diario` AS `limite_diario`,(case when (`c`.`fecha_contador` <=> curdate()) then `c`.`enviados_hoy` else 0 end) AS `enviados_hoy`,greatest((`c`.`limite_diario` - (case when (`c`.`fecha_contador` <=> curdate()) then `c`.`enviados_hoy` else 0 end)),0) AS `disponibles_hoy`,`c`.`total_enviados` AS `total_enviados`,`c`.`ultimo_envio_en` AS `ultimo_envio_en`,`c`.`ultimo_error` AS `ultimo_error`,`c`.`ultimo_error_en` AS `ultimo_error_en`,(case when (`c`.`activo` = 0) then 'desactivada' when ((`c`.`bloqueada_hasta` is not null) and (`c`.`bloqueada_hasta` > now())) then 'bloqueada_temporalmente' when ((case when (`c`.`fecha_contador` <=> curdate()) then `c`.`enviados_hoy` else 0 end) >= `c`.`limite_diario`) then 'limite_alcanzado' else 'disponible' end) AS `estado` from `cuentas_correo` `c` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_participaciones`
--

DROP VIEW IF EXISTS `vista_participaciones`;
CREATE VIEW `vista_participaciones` AS
SELECT p.id_participacion, p.creado_en, p.nombre, p.apellidos, p.correo, p.telefono, p.fecha_nacimiento,
       TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
       pa.nombre AS pais,
       e.nombre AS estado,
       m.nombre AS municipio,
       p.ciudad_provincia,
       p.localidad_comunidad,
       COALESCE(ur.nombre, 'Otros (fuera de la UAS)') AS unidad_regional,
       COALESCE(ef.nombre, p.institucion_externa) AS escuela_facultad,
       p.hogar_kg, p.transporte_kg, p.consumo_kg, p.total_kg, p.nivel, p.correo_enviado
  FROM participaciones p
  JOIN paises pa ON pa.codigo = p.codigo_pais
  LEFT JOIN estados e ON e.id_estado = p.id_estado
  LEFT JOIN municipios m ON m.id_municipio = p.id_municipio
  LEFT JOIN unidades_regionales ur ON ur.id_unidad_regional = p.id_unidad_regional
  LEFT JOIN escuelas_facultades ef ON ef.id_escuela_facultad = p.id_escuela_facultad;

--
-- Final view structure for view `vista_resumen_por_escuela_facultad`
--

/*!50001 DROP VIEW IF EXISTS `vista_resumen_por_escuela_facultad`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `vista_resumen_por_escuela_facultad` AS select `ef`.`id_escuela_facultad` AS `id_escuela_facultad`,`ur`.`nombre` AS `unidad_regional`,`ef`.`nombre` AS `escuela_facultad`,count(`p`.`id_participacion`) AS `participaciones`,round(avg(`p`.`total_kg`),2) AS `promedio_total_kg`,round(avg(`p`.`hogar_kg`),2) AS `promedio_hogar_kg`,round(avg(`p`.`transporte_kg`),2) AS `promedio_transporte_kg`,round(avg(`p`.`consumo_kg`),2) AS `promedio_consumo_kg` from ((`escuelas_facultades` `ef` join `unidades_regionales` `ur` on((`ur`.`id_unidad_regional` = `ef`.`id_unidad_regional`))) left join `participaciones` `p` on((`p`.`id_escuela_facultad` = `ef`.`id_escuela_facultad`))) group by `ef`.`id_escuela_facultad`,`ur`.`nombre`,`ef`.`nombre` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_resumen_por_unidad_regional`
--

/*!50001 DROP VIEW IF EXISTS `vista_resumen_por_unidad_regional`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `vista_resumen_por_unidad_regional` AS select `ur`.`id_unidad_regional` AS `id_unidad_regional`,`ur`.`nombre` AS `unidad_regional`,count(`p`.`id_participacion`) AS `participaciones`,round(avg(`p`.`total_kg`),2) AS `promedio_total_kg`,round(avg(`p`.`hogar_kg`),2) AS `promedio_hogar_kg`,round(avg(`p`.`transporte_kg`),2) AS `promedio_transporte_kg`,round(avg(`p`.`consumo_kg`),2) AS `promedio_consumo_kg` from (`unidades_regionales` `ur` left join `participaciones` `p` on((`p`.`id_unidad_regional` = `ur`.`id_unidad_regional`))) group by `ur`.`id_unidad_regional`,`ur`.`nombre` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Esquema generado a partir del dump del 2026-10-27
